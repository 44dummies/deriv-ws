/**
 * TraderMind WebSocket Integration
 * Wires MarketDataService events to SessionRegistry
 * Wires ExecutionCore, QuantEngine, and RiskGuard events to WebSocket clients
 * Includes circuit breaker safety layer with auto-resume
 */

import { EventEmitter } from 'eventemitter3';
import { marketDataService } from './container.js'; // Singleton via container
import { sessionRegistry } from './container.js';
import { derivWSClient } from './DerivWSClient.js';
import { executionCore, TradeResult } from './ExecutionCore.js'; // Type import from file, instance from container? No, importing executionCore from file is broken now.
// We need to import TYPES from file, and INSTANCES from container.
// But Wait. ExecutionCore CLASS is exported from ExecutionCore.ts. usage of executionCore singleton is what we fix.
import { executionCore as executionCoreInstance, riskGuard as riskGuardInstance, quantEngine as quantEngineInstance } from './container.js';
import { RiskCheck } from './RiskGuard.js';
import { Signal } from './QuantEngine.js';
// Correct way:
import {
    executionCore,
    riskGuard,
    quantEngine,
    marketDataService,
    sessionRegistry
} from './container.js';
import { TradeResult } from './ExecutionCore.js';
import { RiskCheck } from './RiskGuard.js';
import { Signal } from './QuantEngine.js';
import { getWebSocketServer } from './WebSocketServer.js';
import { logger } from '../utils/logger.js';


// =============================================================================
// TYPES
// =============================================================================

type SafetyLayerEvents = {
    circuit_breaker_triggered: (reason: string, pausedCount: number) => void;
    circuit_breaker_reset: (resumedCount: number) => void;
    session_paused: (sessionId: string, reason: string) => void;
    session_resumed: (sessionId: string) => void;
};

// =============================================================================
// SAFETY LAYER
// =============================================================================

class SafetyLayer extends EventEmitter<SafetyLayerEvents> {
    private isIntegrated = false;
    private circuitBreakerActive = false;
    private pausedByCircuitBreaker: Set<string> = new Set();

    constructor() {
        super();
    }

    integrate(): void {
        if (this.isIntegrated) return;
        this.isIntegrated = true;

        logger.info('Initializing circuit breaker integration', { service: 'SafetyLayer' });

        // Heartbeat failed → pause sessions
        marketDataService.on('heartbeat_failed', (market: string) => {
            logger.warn('Heartbeat failed', { service: 'SafetyLayer', market });
            const paused = sessionRegistry.pauseSessionsByMarket(market);

            for (const sessionId of paused) {
                this.emit('session_paused', sessionId, `heartbeat_failed:${market}`);
            }

            if (paused.length > 0) {
                logger.info('Paused sessions due to heartbeat failure', { service: 'SafetyLayer', count: paused.length, sessions: paused });
            }
        });

        // Market resumed → resume sessions (if circuit breaker not active)
        marketDataService.on('market_resumed', (market: string) => {
            if (this.circuitBreakerActive) {
                logger.info('Market resumed but circuit breaker active - not resuming sessions', { service: 'SafetyLayer', market });
                return;
            }

            logger.info('Market resumed', { service: 'SafetyLayer', market });
            const resumed = sessionRegistry.resumeSessionsByMarket(market);

            for (const sessionId of resumed) {
                this.emit('session_resumed', sessionId);
            }

            if (resumed.length > 0) {
                logger.info('Resumed sessions after market resumed', { service: 'SafetyLayer', count: resumed.length, sessions: resumed });
            }
        });

        // Circuit breaker triggered → pause ALL running sessions
        derivWSClient.on('circuitBreaker', (reason: string) => {
            this.handleCircuitBreakerTriggered(reason);
        });

        // Connection restored after circuit breaker
        derivWSClient.on('connected', () => {
            logger.info('WebSocket connected', { service: 'SafetyLayer' });

            // Check if we need to reset circuit breaker
            if (this.circuitBreakerActive && !derivWSClient.isCircuitOpen()) {
                this.handleCircuitBreakerReset();
            }
        });

        derivWSClient.on('disconnected', (reason: string) => {
            logger.warn('WebSocket disconnected', { service: 'SafetyLayer', reason });
        });

        logger.info('Integration complete', { service: 'SafetyLayer' });
    }

    private handleCircuitBreakerTriggered(reason: string): void {
        this.circuitBreakerActive = true;
        this.pausedByCircuitBreaker.clear();

        logger.error('CIRCUIT BREAKER TRIGGERED', { service: 'SafetyLayer', reason });

        const allSessions = sessionRegistry.listSessions();
        let pausedCount = 0;

        for (const session of allSessions) {
            if (session.status === 'RUNNING') {
                try {
                    sessionRegistry.updateSessionStatus(session.id, 'PAUSED');
                    this.pausedByCircuitBreaker.add(session.id);
                    pausedCount++;
                    this.emit('session_paused', session.id, `circuit_breaker:${reason}`);
                } catch (err) {
                    logger.error('Failed to pause session', { service: 'SafetyLayer', sessionId: session.id }, err instanceof Error ? err : undefined);
                }
            }
        }

        logger.warn('Paused sessions due to circuit breaker', { service: 'SafetyLayer', count: pausedCount });
        this.emit('circuit_breaker_triggered', reason, pausedCount);
    }

    private handleCircuitBreakerReset(): void {
        if (!this.circuitBreakerActive) return;

        logger.info('CIRCUIT BREAKER RESET - attempting to resume sessions', { service: 'SafetyLayer' });

        let resumedCount = 0;

        for (const sessionId of this.pausedByCircuitBreaker) {
            const session = sessionRegistry.getSessionState(sessionId);

            // Only resume if still paused
            if (session && session.status === 'PAUSED') {
                try {
                    sessionRegistry.updateSessionStatus(sessionId, 'RUNNING');
                    resumedCount++;
                    this.emit('session_resumed', sessionId);
                } catch (err) {
                    logger.error('Failed to resume session', { service: 'SafetyLayer', sessionId }, err instanceof Error ? err : undefined);
                }
            }
        }

        this.pausedByCircuitBreaker.clear();
        this.circuitBreakerActive = false;

        logger.info('Resumed sessions after circuit breaker reset', { service: 'SafetyLayer', count: resumedCount });
        this.emit('circuit_breaker_reset', resumedCount);
    }

    // Manual circuit breaker reset (for admin use)
    forceResetCircuitBreaker(): number {
        logger.info('Manual circuit breaker reset requested', { service: 'SafetyLayer' });
        derivWSClient.resetCircuitBreaker();
        this.handleCircuitBreakerReset();
        return this.pausedByCircuitBreaker.size;
    }

    isCircuitBreakerActive(): boolean {
        return this.circuitBreakerActive;
    }

    getPausedByCircuitBreaker(): string[] {
        return Array.from(this.pausedByCircuitBreaker);
    }

    getStats(): {
        marketDataHealthy: boolean;
        wsConnected: boolean;
        wsCircuitOpen: boolean;
        circuitBreakerActive: boolean;
        activeSessions: number;
        pausedSessions: number;
        pausedByCircuitBreaker: number;
    } {
        const sessions = sessionRegistry.listSessions();
        const activeSessions = sessions.filter(s => s.status === 'RUNNING').length;
        const pausedSessions = sessions.filter(s => s.status === 'PAUSED').length;

        return {
            marketDataHealthy: marketDataService.isHealthy(),
            wsConnected: derivWSClient.isConnected(),
            wsCircuitOpen: derivWSClient.isCircuitOpen(),
            circuitBreakerActive: this.circuitBreakerActive,
            activeSessions,
            pausedSessions,
            pausedByCircuitBreaker: this.pausedByCircuitBreaker.size,
        };
    }
}

// =============================================================================
// TRADING EVENT INTEGRATION
// =============================================================================

let tradingEventsWired = false;

/**
 * Wire trading pipeline events to WebSocket clients.
 * This is the CRITICAL integration that enables real-time UI updates.
 */
function integrateTradingEvents(): void {
    if (tradingEventsWired) {
        logger.info('Trading events already wired, skipping', { service: 'WSIntegration' });
        return;
    }
    tradingEventsWired = true;

    logger.info('Wiring trading pipeline events to WebSocket', { service: 'WSIntegration' });

    // -------------------------------------------------------------------------
    // ExecutionCore: TRADE_EXECUTED → WebSocket clients
    // Fixes Critical Bug #1: Trade executions now reach the UI
    // -------------------------------------------------------------------------
    executionCore.on('TRADE_EXECUTED', (result: TradeResult) => {
        const wsServer = getWebSocketServer();
        if (!wsServer) {
            logger.warn('WebSocket server not available for trade event', { service: 'WSIntegration' });
            return;
        }

        logger.info('Forwarding TRADE_EXECUTED to WebSocket', {
            service: 'WSIntegration',
            sessionId: result.sessionId,
            tradeId: result.tradeId,
            status: result.status
        });

        wsServer.emitTradeExecuted(result.sessionId, result.userId, result);

        // Also emit directly to the user (ensures visibility even if not in session room, e.g. manual trades)
        wsServer.emitToUser(result.userId, 'TRADE_EXECUTED', result);
    });

    // -------------------------------------------------------------------------
    // ExecutionCore: TRADE_SETTLED → WebSocket clients
    // Fixes Live Feed: Settlement details now reach the UI
    // -------------------------------------------------------------------------
    executionCore.on('TRADE_SETTLED', (result) => {
        const wsServer = getWebSocketServer();
        if (!wsServer) return;

        logger.info('Forwarding TRADE_SETTLED to WebSocket', {
            service: 'WSIntegration',
            sessionId: result.sessionId,
            tradeId: result.tradeId,
            profit: result.profit,
            status: result.status
        });

        // Use generic emitToSession or specific method if exists
        // Since WebSocketServer.ts might not have emitTradeSettled, using generic emitToSession
        wsServer.emitToSession(result.sessionId, 'TRADE_SETTLED', result);

        // Also emit directly to the user
        wsServer.emitToUser(result.userId, 'TRADE_SETTLED', result);
    });

    // -------------------------------------------------------------------------
    // QuantEngine: signal → WebSocket clients
    // Fixes Critical Bug #2: Signals now reach the UI
    // -------------------------------------------------------------------------
    quantEngine.on('signal', (signal: Signal) => {
        const wsServer = getWebSocketServer();
        if (!wsServer) return;

        // Determine which sessions should receive this signal
        // Signal needs to be sent to all active sessions that subscribe to this market
        const activeSessions = sessionRegistry.getActiveSessions();
        for (const session of activeSessions) {
            if (session.config_json?.allowed_markets?.includes(signal.market)) {
                logger.debug('Forwarding signal to session', {
                    service: 'WSIntegration',
                    sessionId: session.id,
                    signalType: signal.type,
                    market: signal.market
                });
                wsServer.emitSignal(session.id, signal);
            }
        }
    });

    // AI signals follow the same pattern
    quantEngine.on('ai_signal', (signal: Signal) => {
        const wsServer = getWebSocketServer();
        if (!wsServer) return;

        const activeSessions = sessionRegistry.getActiveSessions();
        for (const session of activeSessions) {
            if (session.config_json?.allowed_markets?.includes(signal.market)) {
                logger.debug('Forwarding AI signal to session', {
                    service: 'WSIntegration',
                    sessionId: session.id,
                    signalType: signal.type,
                    market: signal.market,
                    isAI: true
                });
                wsServer.emitSignal(session.id, { ...signal, source: 'AI' });
            }
        }
    });

    // -------------------------------------------------------------------------
    // RiskGuard: risk_check_completed → WebSocket clients
    // Fixes Critical Bug #3: Risk events now reach the UI
    // -------------------------------------------------------------------------
    riskGuard.on('risk_check_completed', (check: RiskCheck) => {
        const wsServer = getWebSocketServer();
        if (!wsServer) return;

        logger.debug('Forwarding risk check to WebSocket', {
            service: 'WSIntegration',
            sessionId: check.sessionId,
            result: check.result
        });

        // Emit risk approved or rejected based on result
        if (check.result === 'APPROVED') {
            wsServer.emitRiskApproved(check.sessionId, check);
        } else {
            // Emit rejected as well - use the session emit for flexibility
            wsServer.emitToSession(check.sessionId, 'RISK_REJECTED', {
                session_id: check.sessionId,
                user_id: check.userId,
                reason: check.reason,
                signal: check.proposedTrade,
                rejected_at: new Date().toISOString()
            });
        }
    });

    // -------------------------------------------------------------------------
    // Session Status Updates
    // Fixes Wiring Issue #1: session_status_update now emitted
    // -------------------------------------------------------------------------
    safetyLayer.on('session_paused', (sessionId: string, reason: string) => {
        const wsServer = getWebSocketServer();
        if (!wsServer) return;

        wsServer.emitToSession(sessionId, 'SESSION_UPDATED', {
            session_id: sessionId,
            status: 'PAUSED',
            reason,
            updated_at: new Date().toISOString()
        });

        // Also emit the specific event the frontend listens for
        wsServer.getIO().to(`session:${sessionId}`).emit('session_status_update', {
            type: 'SESSION_STATUS_UPDATE',
            payload: { status: 'PAUSED', reason },
            timestamp: new Date().toISOString()
        });
    });

    safetyLayer.on('session_resumed', (sessionId: string) => {
        const wsServer = getWebSocketServer();
        if (!wsServer) return;

        wsServer.emitToSession(sessionId, 'SESSION_UPDATED', {
            session_id: sessionId,
            status: 'ACTIVE',
            updated_at: new Date().toISOString()
        });

        // Also emit the specific event the frontend listens for
        wsServer.getIO().to(`session:${sessionId}`).emit('session_status_update', {
            type: 'SESSION_STATUS_UPDATE',
            payload: { status: 'ACTIVE' },
            timestamp: new Date().toISOString()
        });
    });

    logger.info('Trading event wiring complete', { service: 'WSIntegration' });
}

// function integrateDataFlow(): void {
//     logger.info('Wiring Market Data -> QuantEngine', { service: 'WSIntegration' });
//
//     marketDataService.on('tick_received', (tick) => {
//         // Feed tick to QuantEngine for signal generation
//         // We do not pass session config here - signals are generated globally based on market heuristics
//         // Sessions filter these signals in AutoTradingService
//         quantEngine.processTick(tick);
//     });
// }

// =============================================================================
// EXPORTS
// =============================================================================

export const safetyLayer = new SafetyLayer();

/**
 * Main integration function - wires ALL WebSocket integrations.
 * Call this once during server startup after WebSocket server is initialized.
 */
export function integrateWSWithSessions(): void {
    // Wire safety layer (circuit breaker, market data events)
    safetyLayer.integrate();

    // Wire trading pipeline events (CRITICAL for real-time UI)
    integrateTradingEvents();

    // Wire data flow (CRITICAL for signal generation)
    // REMOVED: Managed by QuantEngineAdapter via container
    // integrateDataFlow();
}

// function integrateDataFlow(): void {
//     logger.info('Wiring Market Data -> QuantEngine', { service: 'WSIntegration' });
//
//     marketDataService.on('tick_received', (tick) => {
//         // Feed tick to QuantEngine for signal generation
//         // We do not pass session config here - signals are generated globally based on market heuristics
//         // Sessions filter these signals in AutoTradingService
//         quantEngine.processTick(tick);
//     });
// }

