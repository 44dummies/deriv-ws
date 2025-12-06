/**
 * Session Manager Service
 * Manages trading sessions (Day/OneTime/Recovery)
 */

const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../db/supabase');

const SESSION_TYPE = {
    DAY: 'day',
    ONE_TIME: 'one_time',
    RECOVERY: 'recovery'
};

const SESSION_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

const PARTICIPANT_STATUS = {
    ACTIVE: 'active',
    REMOVED_TP: 'removed_tp',
    REMOVED_SL: 'removed_sl',
    LEFT: 'left',
    KICKED: 'kicked'
};

class SessionManager {
    constructor() {
        this.activeSession = null;
    }

    /**
     * Get all sessions
     */
    async getAllSessions(filters = {}) {
        let query = supabase
            .from('trading_sessions_v2')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.type) {
            query = query.eq('type', filters.type);
        }
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    /**
     * Get session by ID with participants
     */
    async getSession(sessionId) {
        const { data: session, error } = await supabase
            .from('trading_sessions_v2')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw error;
        if (!session) return null;

        const { data: participants } = await supabase
            .from('session_participants')
            .select('*, user_profiles(id, deriv_id, username, fullname, email)')
            .eq('session_id', sessionId);

        return {
            ...session,
            participants: participants || []
        };
    }

    /**
     * Get active session
     */
    async getActiveSession() {
        const { data, error } = await supabase
            .from('trading_sessions_v2')
            .select('*')
            .eq('status', SESSION_STATUS.RUNNING)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        this.activeSession = data;
        return data;
    }

    /**
     * Create a new session
     */
    async createSession(adminId, sessionData) {
        const session = {
            id: uuidv4(),
            admin_id: adminId,
            name: sessionData.name || this.generateSessionName(sessionData.type),
            type: sessionData.type || SESSION_TYPE.DAY,
            status: SESSION_STATUS.PENDING,
            min_balance: sessionData.minBalance || 10.00,
            default_tp: sessionData.defaultTp || 10.00,
            default_sl: sessionData.defaultSl || 5.00,
            markets: sessionData.markets || ['R_100'],
            strategy: sessionData.strategy || 'ALL',
            staking_mode: sessionData.stakingMode || 'fixed',
            base_stake: sessionData.baseStake || 1.00,
            current_pnl: 0,
            trade_count: 0,
            win_count: 0,
            loss_count: 0,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('trading_sessions_v2')
            .insert(session)
            .select()
            .single();

        if (error) throw error;

        // Log creation
        await this.logActivity('session_created', `Session "${session.name}" created`, {
            sessionId: data.id,
            adminId,
            type: session.type
        });

        return data;
    }

    /**
     * Start a session
     */
    async startSession(sessionId) {
        // Check for already running session
        const active = await this.getActiveSession();
        if (active && active.id !== sessionId) {
            throw new Error('Another session is already running. Stop it first.');
        }

        const { data, error } = await supabase
            .from('trading_sessions_v2')
            .update({
                status: SESSION_STATUS.RUNNING,
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .select()
            .single();

        if (error) throw error;

        this.activeSession = data;

        await this.logActivity('session_started', `Session "${data.name}" started`, {
            sessionId
        });

        return data;
    }

    /**
     * Stop a session
     */
    async stopSession(sessionId) {
        const { data, error } = await supabase
            .from('trading_sessions_v2')
            .update({
                status: SESSION_STATUS.COMPLETED,
                ended_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .select()
            .single();

        if (error) throw error;

        if (this.activeSession && this.activeSession.id === sessionId) {
            this.activeSession = null;
        }

        await this.logActivity('session_ended', `Session "${data.name}" ended`, {
            sessionId,
            finalPnl: data.current_pnl,
            tradeCount: data.trade_count
        });

        return data;
    }

    /**
     * Get active participants for a session
     */
    async getActiveParticipants(sessionId) {
        const { data, error } = await supabase
            .from('session_participants')
            .select('*, user_profiles(id, deriv_id, username)')
            .eq('session_id', sessionId)
            .eq('status', PARTICIPANT_STATUS.ACTIVE);

        if (error) throw error;
        return data || [];
    }

    /**
     * Get participants with tokens for trading
     */
    async getParticipantsForTrading(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) throw new Error('Session not found');

        const participants = await this.getActiveParticipants(sessionId);

        // Get trading accounts for each participant
        const result = [];
        for (const p of participants) {
            const { data: accounts } = await supabase
                .from('trading_accounts')
                .select('id, deriv_account_id, deriv_token, balance')
                .eq('user_id', p.user_id)
                .eq('is_active', true);

            if (accounts && accounts.length > 0) {
                for (const account of accounts) {
                    // Check minimum balance
                    if (account.balance >= session.min_balance) {
                        result.push({
                            participantId: p.id,
                            userId: p.user_id,
                            accountId: account.deriv_account_id,
                            apiToken: account.deriv_token,
                            balance: account.balance,
                            tp: p.tp,
                            sl: p.sl,
                            minBalance: session.min_balance,
                            stake: session.base_stake
                        });
                    }
                }
            }
        }

        return result;
    }

    /**
     * Add user to session
     */
    async addParticipant(sessionId, userId, tp, sl) {
        const session = await this.getSession(sessionId);
        if (!session) throw new Error('Session not found');

        // Validate TP/SL against session minimums
        if (tp < session.default_tp || sl < session.default_sl) {
            throw new Error(`TP must be >= ${session.default_tp} and SL must be >= ${session.default_sl}`);
        }

        const participant = {
            id: uuidv4(),
            session_id: sessionId,
            user_id: userId,
            tp,
            sl,
            status: PARTICIPANT_STATUS.ACTIVE,
            current_pnl: 0,
            accepted_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('session_participants')
            .insert(participant)
            .select()
            .single();

        if (error) throw error;

        await this.logActivity('user_joined', `User joined session`, {
            sessionId,
            userId,
            tp,
            sl
        });

        return data;
    }

    /**
     * Remove participant from session
     */
    async removeParticipant(sessionId, userId, reason) {
        const { data, error } = await supabase
            .from('session_participants')
            .update({
                status: reason === 'tp_hit' ? PARTICIPANT_STATUS.REMOVED_TP : PARTICIPANT_STATUS.REMOVED_SL,
                removed_at: new Date().toISOString(),
                removal_reason: reason
            })
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .eq('status', PARTICIPANT_STATUS.ACTIVE)
            .select()
            .single();

        if (error) throw error;

        await this.logActivity('user_removed', `User removed from session: ${reason}`, {
            sessionId,
            userId,
            reason
        });

        return data;
    }

    /**
     * Update session stats after trade
     */
    async updateSessionStats(sessionId, tradeResult) {
        const { data: session } = await supabase
            .from('trading_sessions_v2')
            .select('current_pnl, trade_count, win_count, loss_count')
            .eq('id', sessionId)
            .single();

        if (!session) return;

        const updates = {
            trade_count: session.trade_count + 1,
            current_pnl: session.current_pnl + tradeResult.profit,
            updated_at: new Date().toISOString()
        };

        if (tradeResult.result === 'won') {
            updates.win_count = session.win_count + 1;
        } else if (tradeResult.result === 'lost') {
            updates.loss_count = session.loss_count + 1;
        }

        await supabase
            .from('trading_sessions_v2')
            .update(updates)
            .eq('id', sessionId);
    }

    /**
     * Generate session name
     */
    generateSessionName(type) {
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
        return `${typeLabel} Session - ${date} ${time}`;
    }

    /**
     * Log activity
     */
    async logActivity(type, message, metadata = {}) {
        await supabase
            .from('activity_logs_v2')
            .insert({
                id: uuidv4(),
                type,
                level: 'info',
                message,
                metadata,
                session_id: metadata.sessionId,
                user_id: metadata.userId,
                created_at: new Date().toISOString()
            });
    }
}

// Singleton instance
const sessionManager = new SessionManager();

module.exports = {
    SessionManager,
    sessionManager,
    SESSION_TYPE,
    SESSION_STATUS,
    PARTICIPANT_STATUS
};
