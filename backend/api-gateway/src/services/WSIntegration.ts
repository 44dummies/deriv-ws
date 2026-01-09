/**
 * TraderMind WebSocket Integration
 * Wires MarketDataService events to SessionRegistry
 * Includes circuit breaker safety layer with auto-resume
 */

import { EventEmitter } from 'eventemitter3';
import { marketDataService } from './MarketDataService.js';
import { sessionRegistry } from './SessionRegistry.js';
import { derivWSClient } from './DerivWSClient.js';
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
// EXPORTS
// =============================================================================

export const safetyLayer = new SafetyLayer();

// Convenience function for backward compatibility
export function integrateWSWithSessions(): void {
    safetyLayer.integrate();
}

export function getIntegrationStats() {
    return safetyLayer.getStats();
}
