import { EventEmitter } from 'eventemitter3';
import { Signal, quantEngine } from './QuantEngine.js';
import { sessionRegistry } from './SessionRegistry.js';
import { memoryService } from './MemoryService.js';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

export interface RiskCheck {
    userId: string;
    sessionId: string;
    proposedTrade: Signal;
    result: 'APPROVED' | 'REJECTED';
    reason?: string;
    memoryId?: string; // Link to immutable memory record
    meta?: {
        userDrawdown?: number;
        sessionPnL?: number;
        userDailyLoss?: number;
    };
}

export interface UserRiskState {
    dailyLoss: number;
    maxDailyLoss: number;
    currentDrawdown: number;
    maxDrawdown: number;
    tradesToday: number;
    maxTradesPerDay: number;
}

type RiskGuardEvents = {
    risk_check_completed: (check: RiskCheck) => void;
};

// =============================================================================
// RISK GUARD SERVICE
// =============================================================================

export class RiskGuard extends EventEmitter<RiskGuardEvents> {
    constructor() {
        super();
        this.initialize();
        logger.info('RiskGuard initialized');
    }

    private initialize(): void {
        // Listen for signals from QuantEngine
        quantEngine.on('signal', (signal: Signal) => {
            this.handleSignal(signal);
        });

        // Also listen for AI signals
        quantEngine.on('ai_signal', (signal: Signal) => {
            this.handleSignal(signal);
        });
    }

    private handleSignal(signal: Signal): void {
        // Check all active sessions
        const sessions = sessionRegistry.getActiveSessions();
        if (sessions.length === 0) {
            // console.log('[RiskGuard] No active sessions for signal:', signal.market);
            return;
        }

        for (const session of sessions) {
            // Evaluate if this session should trade this market
            if (session.config_json.allowed_markets?.includes(signal.market)) {

                // Determine participants for this session (Stub: defaulting to a 'stub-user-id')
                // In a real implementation we iterate session.participants.keys()
                // For "Day 2" verification we will simulate the check for a test user

                // If there are participants, we check for each? 
                // Or check for the *session* first (Gloabal loss), then users?

                this.evaluateSessionRisk(session.id, signal);
            }
        }
    }

    private evaluateSessionRisk(sessionId: string, signal: Signal): void {
        const session = sessionRegistry.getSessionState(sessionId);
        if (!session) return;

        // 1. Session Level Check (Global PnL)
        let totalPnL = 0;
        for (const p of session.participants.values()) {
            totalPnL += p.pnl;
        }

        const lossThreshold = session.config_json.global_loss_threshold ?? 1000;
        if (totalPnL <= -lossThreshold) {
            const participants = Array.from(session.participants.keys());
            // SECURITY: Never use stub users - skip if no real participants
            if (participants.length === 0) {
                logger.warn('Session has no participants, skipping signal', { sessionId });
                return;
            }
            for (const userId of participants) {
                this.rejectTrade(userId, sessionId, signal, `Session Global Loss Limit Hit: ${totalPnL}`);
            }
            return;
        }

        // 2. User Level Check (Iterate participants only - no stubs)
        const participants = Array.from(session.participants.keys());
        if (participants.length === 0) {
            // No participants = no trades to evaluate
            logger.warn('Session has no participants, skipping signal', { sessionId });
            return;
        }
        for (const userId of participants) {
            this.evaluateUserRisk(userId, sessionId, signal);
        }
    }

    public evaluateManualTrade(input: {
        userId: string;
        sessionId: string;
        market: string;
        contractType: 'CALL' | 'PUT' | 'DIGITOVER' | 'DIGITUNDER';
        duration: number;
        durationUnit?: 'm' | 's' | 'h' | 'd' | 't';
    }): RiskCheck {
        const now = new Date();
        const durationMs = this.durationToMs(input.duration, input.durationUnit ?? 'm');
        const signalType = input.contractType === 'PUT' || input.contractType === 'DIGITUNDER' ? 'PUT' : 'CALL';

        const signal: Signal = {
            type: signalType,
            confidence: 1,
            reason: 'NO_SIGNAL',
            market: input.market,
            timestamp: now.toISOString(),
            expiry: new Date(now.getTime() + durationMs).toISOString()
        };

        return this.evaluateUserRiskInternal(input.userId, input.sessionId, signal);
    }

    private evaluateUserRisk(userId: string, sessionId: string, signal: Signal): void {
        const check = this.evaluateUserRiskInternal(userId, sessionId, signal);
        this.emitRiskResult(check);
    }

    private evaluateUserRiskInternal(userId: string, sessionId: string, signal: Signal): RiskCheck {
        const check: RiskCheck = {
            userId,
            sessionId,
            proposedTrade: signal,
            result: 'APPROVED',
            meta: {}
        };

        const userState = this.getUserRiskState(userId);

        check.meta = {
            userDrawdown: userState.currentDrawdown,
            userDailyLoss: userState.dailyLoss
        };

        // Drawdown Check
        if (userState.currentDrawdown >= userState.maxDrawdown) {
            check.result = 'REJECTED';
            check.reason = `User Max Drawdown Exceeded: ${userState.currentDrawdown}% >= ${userState.maxDrawdown}%`;
            return check;
        }

        // Daily Loss Check
        if (userState.dailyLoss >= userState.maxDailyLoss) {
            check.result = 'REJECTED';
            check.reason = `User Daily Loss Limit Exceeded: ${userState.dailyLoss} >= ${userState.maxDailyLoss}`;
            return check;
        }

        // Max Trades Check
        if (userState.tradesToday >= userState.maxTradesPerDay) {
            check.result = 'REJECTED';
            check.reason = `User Max Trades Limit Reached: ${userState.tradesToday}`;
            return check;
        }

        // Approved
        return check;
    }

    private rejectTrade(userId: string, sessionId: string, proposedTrade: Signal, reason: string): void {
        const check: RiskCheck = {
            userId,
            sessionId,
            proposedTrade,
            result: 'REJECTED',
            reason,
        };
        this.emitRiskResult(check);
    }

    private emitRiskResult(check: RiskCheck): void {
        const memoryId = randomUUID();
        check.memoryId = memoryId;

        // Fire-and-forget memory recording
        // We do not await this to avoid blocking trade execution latency
        if (check.proposedTrade.metadata) {
            memoryService.recordDecision({
                id: memoryId,
                session_id: check.sessionId,
                user_id: check.userId,
                market: check.proposedTrade.market,
                timestamp: check.proposedTrade.timestamp,
                technicals: check.proposedTrade.metadata.technicals,
                ai_inference: check.proposedTrade.metadata.ai_inference,
                signal: {
                    type: check.proposedTrade.type,
                    source: check.proposedTrade.metadata.ai_inference ? 'AI' : 'RULE',
                    strength: check.proposedTrade.confidence,
                    reason: check.proposedTrade.reason
                },
                risk_check: {
                    approved: check.result === 'APPROVED',
                    reason: check.reason,
                    checks: check.meta
                }
            });
        }

        this.emit('risk_check_completed', check);
        if (check.result === 'REJECTED') {
            logger.warn('Trade REJECTED', { userId: check.userId, reason: check.reason });

            if (check.memoryId) {
                // 1. Update Operational Memory (Mutable)
                memoryService.updateOutcome(check.memoryId, {
                    trade_id: 'n/a',
                    result: 'BLOCKED',
                    settled_at: new Date().toISOString(),
                    pnl: 0
                });

                // 2. Capture Immutable Feature/Signal Pair (Negative Sample)
                const signal = check.proposedTrade;
                const meta: any = signal.metadata || {};

                memoryService.capture({
                    market: signal.market,
                    features: meta.technicals || {},
                    signal: signal,
                    ai_confidence: meta.ai_inference?.confidence,
                    regime: meta.ai_inference?.regime,
                    decision: 'BLOCKED',
                    result: 'NO_TRADE',
                    pnl: 0
                });
            }
        } else {
            logger.info('Trade APPROVED', { userId: check.userId, market: check.proposedTrade.market, type: check.proposedTrade.type });
        }
    }

    private durationToMs(duration: number, unit: 'm' | 's' | 'h' | 'd' | 't'): number {
        switch (unit) {
            case 's':
                return duration * 1000;
            case 'h':
                return duration * 60 * 60 * 1000;
            case 'd':
                return duration * 24 * 60 * 60 * 1000;
            case 't':
                return 0;
            case 'm':
            default:
                return duration * 60 * 1000;
        }
    }

    /**
     * Stub for fetching user risk metrics.
     * In the future, this calls the DB or an AccountService.
     */
    private getUserRiskState(userId: string): UserRiskState {
        // We can use a global map to simulate state changes during testing
        return (global as any)._TEST_USER_RISK_STATE?.[userId] || {
            dailyLoss: 0,
            maxDailyLoss: 500,
            currentDrawdown: 0,
            maxDrawdown: 10,
            tradesToday: 0,
            maxTradesPerDay: 50
        };
    }
}

// Export singleton
export const riskGuard = new RiskGuard();
