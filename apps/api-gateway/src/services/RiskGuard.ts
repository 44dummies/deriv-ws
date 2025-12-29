/**
 * TraderMind RiskGuard
 * Service for evaluating trade risks and approval checks.
 */

import { EventEmitter } from 'eventemitter3';
import { Signal, quantEngine } from './QuantEngine.js';
import { sessionRegistry } from './SessionRegistry.js';

// =============================================================================
// TYPES
// =============================================================================

export interface RiskCheck {
    userId: string;
    sessionId: string;
    proposedTrade: Signal;
    result: 'APPROVED' | 'REJECTED';
    reason?: string;
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
        console.log('[RiskGuard] Initialized');
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
            if (participants.length === 0) {
                this.rejectTrade('stub-user-id', sessionId, signal, `Session Global Loss Limit Hit: ${totalPnL}`);
            } else {
                for (const userId of participants) {
                    this.rejectTrade(userId, sessionId, signal, `Session Global Loss Limit Hit: ${totalPnL}`);
                }
            }
            return;
        }

        // 2. User Level Check (Iterate participants or stub)
        const participants = Array.from(session.participants.keys());
        if (participants.length === 0) {
            // For testing if no participants joined yet, use stub
            this.evaluateUserRisk('stub-user-id', sessionId, signal);
        } else {
            for (const userId of participants) {
                this.evaluateUserRisk(userId, sessionId, signal);
            }
        }
    }

    private evaluateUserRisk(userId: string, sessionId: string, signal: Signal): void {
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
            this.emitRiskResult(check);
            return;
        }

        // Daily Loss Check
        if (userState.dailyLoss >= userState.maxDailyLoss) {
            check.result = 'REJECTED';
            check.reason = `User Daily Loss Limit Exceeded: ${userState.dailyLoss} >= ${userState.maxDailyLoss}`;
            this.emitRiskResult(check);
            return;
        }

        // Max Trades Check
        if (userState.tradesToday >= userState.maxTradesPerDay) {
            check.result = 'REJECTED';
            check.reason = `User Max Trades Limit Reached: ${userState.tradesToday}`;
            this.emitRiskResult(check);
            return;
        }

        // Approved
        this.emitRiskResult(check);
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
        this.emit('risk_check_completed', check);
        if (check.result === 'REJECTED') {
            console.warn(`[RiskGuard] REJECTED (User: ${check.userId}): ${check.reason}`);
        } else {
            console.log(`[RiskGuard] APPROVED (User: ${check.userId}): ${check.proposedTrade.market} ${check.proposedTrade.type}`);
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
