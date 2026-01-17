/**
 * TraderMind Auto Trading Service
 * ORCHESTRATOR: Wires QuantEngine signals to RiskGuard for execution.
 * This is the "Trading Loop" for automated sessions.
 */

import { quantEngine, Signal } from './QuantEngine.js';
import { riskGuard } from './RiskGuard.js';
import { sessionRegistry } from './SessionRegistry.js';
import { logger } from '../utils/logger.js';

class AutoTradingService {
    private isIntegrated = false;

    integrate(): void {
        if (this.isIntegrated) return;
        this.isIntegrated = true;

        logger.info('Initializing Auto Trading Service (Signal -> Execution Wiring)');

        // Listen for signals (Technical Analysis)
        quantEngine.on('signal', (signal: Signal) => {
            this.handleSignal(signal, 'TECHNICAL');
        });

        // Listen for AI signals
        quantEngine.on('ai_signal', (signal: Signal) => {
            this.handleSignal(signal, 'AI');
        });
    }

    private handleSignal(signal: Signal, source: 'TECHNICAL' | 'AI'): void {
        // 1. Get all active sessions
        const activeSessions = sessionRegistry.getActiveSessions();
        if (activeSessions.length === 0) return;

        logger.debug('Processing signal for active sessions', {
            market: signal.market,
            type: signal.type,
            sessions: activeSessions.length
        });

        // 2. Iterate through sessions and check if they are interested in this market
        for (const session of activeSessions) {
            const allowedMarkets = session.config_json?.allowed_markets;

            // If session has specific markets allowed, check match. If null/empty, assume ALL markets allowed (or NO markets? Safer to assume specific list required).
            // Currently assuming if allowed_markets is defined, we check it.
            if (allowedMarkets && !allowedMarkets.includes(signal.market)) {
                continue;
            }

            if (!session.admin_id) {
                logger.warn('Session has no admin_id, cannot execute auto trade', { sessionId: session.id });
                continue;
            }

            // 3. Trigger Risk Guard for this session
            // This starts the execution pipeline: RiskGuard -> ExecutionCore -> Deriv
            riskGuard.evaluateAutoTrade({
                sessionId: session.id,
                userId: session.admin_id as string, // Checked above
                signal: signal,
                source: source
            });
        }
    }
}

export const autoTradingService = new AutoTradingService();
