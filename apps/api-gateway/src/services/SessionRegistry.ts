/**
 * TraderMind SessionRegistry
 * In-memory session state management with type-safe immutable updates
 */

// =============================================================================
// TYPES
// =============================================================================

export type SessionStatus = 'PENDING' | 'ACTIVE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export type ParticipantStatus = 'PENDING' | 'ACTIVE' | 'FAILED' | 'REMOVED' | 'OPTED_OUT';

export interface SessionConfig {
    max_participants?: number;
    min_balance?: number;
    risk_profile?: 'LOW' | 'MEDIUM' | 'HIGH';
    allowed_markets?: string[];
    global_loss_threshold?: number;
}

export interface Participant {
    user_id: string;
    status: ParticipantStatus;
    pnl: number;
    joined_at: string;
}

export interface SessionState {
    id: string;
    status: SessionStatus;
    config_json: SessionConfig;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    participants: Map<string, Participant>;
    admin_id: string | null;
}

export interface CreateSessionInput {
    id: string;
    config_json?: SessionConfig;
    status?: SessionStatus;
    admin_id?: string | undefined;
}

// =============================================================================
// SESSION REGISTRY
// =============================================================================

export class SessionRegistry {
    private sessions: Map<string, SessionState> = new Map();
    private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds

    // ---------------------------------------------------------------------------
    // SESSION OPERATIONS
    // ---------------------------------------------------------------------------

    /**
     * Create a new session
     */
    createSession(input: CreateSessionInput): SessionState {
        const { id, config_json = {}, status = 'PENDING', admin_id = null } = input;

        if (this.sessions.has(id)) {
            throw new Error(`Session ${id} already exists`);
        }

        const session: SessionState = {
            id,
            status,
            config_json: { ...config_json },
            created_at: new Date().toISOString(),
            started_at: null,
            completed_at: null,
            participants: new Map(),
            admin_id,
        };

        this.sessions.set(id, session);
        console.log(`[SessionRegistry] Created session: ${id}`);
        return this.cloneSession(session);
    }

    /**
     * Get session state (immutable copy)
     */
    getSessionState(sessionId: string): SessionState | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        return this.cloneSession(session);
    }

    /**
     * Update session status
     */
    updateSessionStatus(sessionId: string, status: SessionStatus): SessionState {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Validate state transitions
        this.validateStatusTransition(session.status, status);

        const updated: SessionState = {
            ...session,
            status,
            started_at: status === 'ACTIVE' ? new Date().toISOString() : session.started_at,
            completed_at: status === 'COMPLETED' ? new Date().toISOString() : session.completed_at,
            participants: new Map(session.participants),
        };

        this.sessions.set(sessionId, updated);
        console.log(`[SessionRegistry] Session ${sessionId} status: ${session.status} -> ${status}`);
        return this.cloneSession(updated);
    }

    /**
     * List all sessions
     */
    listSessions(): SessionState[] {
        return Array.from(this.sessions.values()).map((s) => this.cloneSession(s));
    }

    /**
     * Get active sessions (RUNNING or ACTIVE status)
     */
    getActiveSessions(): SessionState[] {
        return this.listSessions().filter(s => s.status === 'ACTIVE' || s.status === 'RUNNING');
    }

    /**
     * Delete session
     */
    deleteSession(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        // Remove all participants
        for (const [userId] of session.participants) {
            const userSessions = this.userSessions.get(userId);
            userSessions?.delete(sessionId);
        }

        this.sessions.delete(sessionId);
        console.log(`[SessionRegistry] Deleted session: ${sessionId}`);
        return true;
    }

    // ---------------------------------------------------------------------------
    // PARTICIPANT OPERATIONS
    // ---------------------------------------------------------------------------

    /**
     * Add participant to session
     */
    addParticipant(sessionId: string, userId: string): Participant {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        if (session.participants.has(userId)) {
            throw new Error(`User ${userId} already in session ${sessionId}`);
        }

        // Check max participants
        const maxParticipants = session.config_json.max_participants ?? Infinity;
        if (session.participants.size >= maxParticipants) {
            throw new Error(`Session ${sessionId} is full (max: ${maxParticipants})`);
        }

        const participant: Participant = {
            user_id: userId,
            status: 'ACTIVE',
            pnl: 0,
            joined_at: new Date().toISOString(),
        };

        // Update session with new participant
        const updatedParticipants = new Map(session.participants);
        updatedParticipants.set(userId, participant);

        this.sessions.set(sessionId, {
            ...session,
            participants: updatedParticipants,
        });

        // Track user's sessions
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, new Set());
        }
        this.userSessions.get(userId)!.add(sessionId);

        console.log(`[SessionRegistry] User ${userId} joined session ${sessionId}`);
        return { ...participant };
    }

    /**
     * Remove participant from session
     */
    removeParticipant(sessionId: string, userId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        if (!session.participants.has(userId)) {
            return false;
        }

        const updatedParticipants = new Map(session.participants);
        const participant = updatedParticipants.get(userId)!;
        updatedParticipants.set(userId, { ...participant, status: 'REMOVED' });

        this.sessions.set(sessionId, {
            ...session,
            participants: updatedParticipants,
        });

        // Update user's sessions
        this.userSessions.get(userId)?.delete(sessionId);

        console.log(`[SessionRegistry] User ${userId} removed from session ${sessionId}`);
        return true;
    }

    /**
     * Update participant PnL
     */
    updateParticipantPnL(sessionId: string, userId: string, pnlDelta: number): Participant {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const participant = session.participants.get(userId);
        if (!participant) {
            throw new Error(`User ${userId} not in session ${sessionId}`);
        }

        const updatedParticipant: Participant = {
            ...participant,
            pnl: participant.pnl + pnlDelta,
        };

        const updatedParticipants = new Map(session.participants);
        updatedParticipants.set(userId, updatedParticipant);

        this.sessions.set(sessionId, {
            ...session,
            participants: updatedParticipants,
        });

        return { ...updatedParticipant };
    }

    /**
     * Get participant
     */
    getParticipant(sessionId: string, userId: string): Participant | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const participant = session.participants.get(userId);
        return participant ? { ...participant } : null;
    }

    /**
     * Get sessions for user
     */
    getUserSessions(userId: string): string[] {
        return Array.from(this.userSessions.get(userId) ?? []);
    }

    // ---------------------------------------------------------------------------
    // STATE RECOVERY
    // ---------------------------------------------------------------------------

    /**
     * Recover state from database (placeholder)
     */
    /**
     * Recover state from database
     */
    async recoverStateFromDB(): Promise<number> {
        console.log('[SessionRegistry] Recovering state from database...');

        const supabaseUrl = process.env['SUPABASE_URL'];
        const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

        if (!supabaseUrl || !supabaseKey) {
            console.warn('[SessionRegistry] Missing Supabase credentials. Skipping recovery.');
            return 0;
        }

        const supabase = (await import('@supabase/supabase-js')).createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        const { data: activeSessions, error } = await supabase
            .from('sessions')
            .select('*')
            .in('status', ['ACTIVE', 'RUNNING', 'PAUSED']);

        if (error) {
            console.error('[SessionRegistry] Failed to fetch active sessions:', error);
            return 0;
        }

        if (!activeSessions || activeSessions.length === 0) {
            console.log('[SessionRegistry] No active sessions found in DB.');
            return 0;
        }

        let recoveredCount = 0;

        for (const dbSession of activeSessions) {
            try {
                // Fetch participants
                const { data: participants, error: partError } = await supabase
                    .from('participants')
                    .select('*')
                    .eq('session_id', dbSession.id)
                    .neq('status', 'REMOVED'); // Don't recover removed users

                if (partError) {
                    console.error(`[SessionRegistry] Failed to fetch participants for ${dbSession.id}`, partError);
                    continue;
                }

                const participantMap = new Map<string, Participant>();
                for (const p of (participants || [])) {
                    participantMap.set(p.user_id, {
                        user_id: p.user_id,
                        status: p.status as ParticipantStatus,
                        pnl: p.pnl,
                        joined_at: p.joined_at || new Date().toISOString()
                    });

                    // Restore user session mapping
                    if (!this.userSessions.has(p.user_id)) {
                        this.userSessions.set(p.user_id, new Set());
                    }
                    this.userSessions.get(p.user_id)!.add(dbSession.id);
                }

                const sessionState: SessionState = {
                    id: dbSession.id,
                    status: dbSession.status as SessionStatus,
                    config_json: typeof dbSession.config_json === 'string' ? JSON.parse(dbSession.config_json) : dbSession.config_json,
                    created_at: dbSession.created_at,
                    started_at: dbSession.started_at,
                    completed_at: dbSession.completed_at,
                    participants: participantMap,
                    admin_id: dbSession.admin_id // Assuming DB has this column, if not it might be null
                };

                this.sessions.set(dbSession.id, sessionState);
                recoveredCount++;
                console.log(`[SessionRegistry] Recovered session ${dbSession.id} with ${participantMap.size} participants.`);

            } catch (err) {
                console.error(`[SessionRegistry] Error recovering session ${dbSession.id}:`, err);
            }
        }

        return recoveredCount;
    }

    /**
     * Serialize state for persistence
     */
    serializeState(): string {
        const data = {
            sessions: Array.from(this.sessions.entries()).map(([id, session]) => ({
                ...session,
                participants: Array.from(session.participants.entries()),
            })),
            timestamp: new Date().toISOString(),
        };
        return JSON.stringify(data);
    }

    // ---------------------------------------------------------------------------
    // UTILITIES
    // ---------------------------------------------------------------------------

    private cloneSession(session: SessionState): SessionState {
        return {
            ...session,
            config_json: { ...session.config_json },
            participants: new Map(session.participants),
        };
    }

    private validateStatusTransition(from: SessionStatus, to: SessionStatus): void {
        const validTransitions: Record<SessionStatus, SessionStatus[]> = {
            PENDING: ['ACTIVE'],
            ACTIVE: ['RUNNING', 'PAUSED', 'COMPLETED'],
            RUNNING: ['PAUSED', 'COMPLETED'],
            PAUSED: ['RUNNING', 'COMPLETED'],
            COMPLETED: [],
        };

        if (!validTransitions[from].includes(to)) {
            throw new Error(`Invalid status transition: ${from} -> ${to}`);
        }
    }

    // ---------------------------------------------------------------------------
    // MARKET DISCONNECT HANDLING
    // ---------------------------------------------------------------------------

    /**
     * Pause all sessions that use a specific market
     */
    pauseSessionsByMarket(market: string): string[] {
        const pausedSessions: string[] = [];

        for (const [sessionId, session] of this.sessions) {
            // Skip already paused or completed sessions
            if (session.status === 'PAUSED' || session.status === 'COMPLETED') {
                continue;
            }

            // Check if session uses this market
            const allowedMarkets = session.config_json.allowed_markets ?? [];
            if (allowedMarkets.length === 0 || allowedMarkets.includes(market)) {
                // Only pause RUNNING sessions
                if (session.status === 'RUNNING') {
                    try {
                        this.updateSessionStatus(sessionId, 'PAUSED');
                        pausedSessions.push(sessionId);
                        console.log(`[SessionRegistry] Paused session ${sessionId} due to ${market} disconnect`);
                    } catch (err) {
                        console.error(`[SessionRegistry] Failed to pause session ${sessionId}:`, err);
                    }
                }
            }
        }

        return pausedSessions;
    }

    /**
     * Resume sessions that were paused due to market disconnect
     */
    resumeSessionsByMarket(market: string): string[] {
        const resumedSessions: string[] = [];

        for (const [sessionId, session] of this.sessions) {
            // Only resume PAUSED sessions
            if (session.status !== 'PAUSED') continue;

            // Check if session uses this market
            const allowedMarkets = session.config_json.allowed_markets ?? [];
            if (allowedMarkets.length === 0 || allowedMarkets.includes(market)) {
                try {
                    this.updateSessionStatus(sessionId, 'RUNNING');
                    resumedSessions.push(sessionId);
                    console.log(`[SessionRegistry] Resumed session ${sessionId} after ${market} reconnect`);
                } catch (err) {
                    console.error(`[SessionRegistry] Failed to resume session ${sessionId}:`, err);
                }
            }
        }

        return resumedSessions;
    }

    /**
     * Get sessions affected by a market
     */
    getSessionsByMarket(market: string): SessionState[] {
        const sessions: SessionState[] = [];

        for (const session of this.sessions.values()) {
            const allowedMarkets = session.config_json.allowed_markets ?? [];
            if (allowedMarkets.length === 0 || allowedMarkets.includes(market)) {
                sessions.push(this.cloneSession(session));
            }
        }

        return sessions;
    }

    /**
     * Get registry stats
     */
    getStats(): { sessions: number; participants: number } {
        let participants = 0;
        for (const session of this.sessions.values()) {
            participants += session.participants.size;
        }
        return { sessions: this.sessions.size, participants };
    }

    /**
     * Clear all sessions (for testing)
     */
    clear(): void {
        this.sessions.clear();
        this.userSessions.clear();
        console.log('[SessionRegistry] Cleared all sessions');
    }
}

// Export singleton instance
export const sessionRegistry = new SessionRegistry();
