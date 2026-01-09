/**
 * TraderMind SignalStore
 * Manages signals per session with expiry and cleanup
 */

import { EventEmitter } from 'eventemitter3';
import { Signal } from './QuantEngine.js';
import { sessionRegistry, SessionStatus } from './SessionRegistry.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface StoredSignal extends Signal {
    id: string;
    sessionId: string;
    createdAt: number;
    expiresAt: number;
    status: 'ACTIVE' | 'EXPIRED' | 'EXECUTED' | 'CANCELLED';
}

export interface SessionSignalStats {
    sessionId: string;
    totalSignals: number;
    activeSignals: number;
    expiredSignals: number;
    executedSignals: number;
}

type SignalStoreEvents = {
    signal_added: (signal: StoredSignal) => void;
    signal_expired: (signal: StoredSignal) => void;
    signal_executed: (signalId: string) => void;
    session_paused: (sessionId: string) => void;
    session_resumed: (sessionId: string) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SIGNAL_TTL_MS = 60000; // 1 minute
const CLEANUP_INTERVAL_MS = 5000;    // Check every 5 seconds

// =============================================================================
// SIGNAL STORE
// =============================================================================

export class SignalStore extends EventEmitter<SignalStoreEvents> {
    private signals: Map<string, StoredSignal> = new Map();
    private sessionSignals: Map<string, Set<string>> = new Map();
    private pausedSessions: Set<string> = new Set();
    private cleanupTimer: NodeJS.Timeout | null = null;
    private signalCounter = 0;

    constructor() {
        super();
        logger.info('Initialized', { service: 'SignalStore' });
    }

    // ---------------------------------------------------------------------------
    // LIFECYCLE
    // ---------------------------------------------------------------------------

    start(): void {
        if (this.cleanupTimer) return;

        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredSignals();
        }, CLEANUP_INTERVAL_MS);

        logger.info('Started cleanup timer', { service: 'SignalStore' });
    }

    stop(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        logger.info('Stopped', { service: 'SignalStore' });
    }

    // ---------------------------------------------------------------------------
    // SIGNAL MANAGEMENT
    // ---------------------------------------------------------------------------

    addSignal(sessionId: string, signal: Signal, ttlMs = DEFAULT_SIGNAL_TTL_MS): StoredSignal | null {
        // Check if session is paused
        if (this.isSessionPaused(sessionId)) {
            logger.info('Session is paused, skipping signal', { service: 'SignalStore', sessionId });
            return null;
        }

        // Check session state
        const session = sessionRegistry.getSessionState(sessionId);
        if (!session || (session.status !== 'RUNNING' && session.status !== 'ACTIVE')) {
            logger.info('Session not active, skipping signal', { service: 'SignalStore', sessionId });
            return null;
        }

        const now = Date.now();
        const id = `sig_${++this.signalCounter}_${now}`;

        const storedSignal: StoredSignal = {
            ...signal,
            id,
            sessionId,
            createdAt: now,
            expiresAt: now + ttlMs,
            status: 'ACTIVE',
        };

        this.signals.set(id, storedSignal);

        // Track by session
        if (!this.sessionSignals.has(sessionId)) {
            this.sessionSignals.set(sessionId, new Set());
        }
        this.sessionSignals.get(sessionId)!.add(id);

        logger.info('Added signal', { service: 'SignalStore', signalId: id, sessionId, expiresIn: ttlMs });
        this.emit('signal_added', storedSignal);

        return storedSignal;
    }

    getSignal(signalId: string): StoredSignal | null {
        const signal = this.signals.get(signalId);
        return signal && signal.status === 'ACTIVE' ? signal : null;
    }

    getActiveSignals(sessionId: string): StoredSignal[] {
        const signalIds = this.sessionSignals.get(sessionId);
        if (!signalIds) return [];

        const active: StoredSignal[] = [];
        const now = Date.now();

        for (const id of signalIds) {
            const signal = this.signals.get(id);
            if (signal && signal.status === 'ACTIVE' && signal.expiresAt > now) {
                active.push(signal);
            }
        }

        return active;
    }

    markExecuted(signalId: string): boolean {
        const signal = this.signals.get(signalId);
        if (!signal || signal.status !== 'ACTIVE') return false;

        signal.status = 'EXECUTED';
        logger.info('Signal marked as executed', { service: 'SignalStore', signalId });
        this.emit('signal_executed', signalId);
        return true;
    }

    cancelSignal(signalId: string): boolean {
        const signal = this.signals.get(signalId);
        if (!signal || signal.status !== 'ACTIVE') return false;

        signal.status = 'CANCELLED';
        logger.info('Signal cancelled', { service: 'SignalStore', signalId });
        return true;
    }

    // ---------------------------------------------------------------------------
    // SESSION CONTROL
    // ---------------------------------------------------------------------------

    pauseSession(sessionId: string): void {
        if (this.pausedSessions.has(sessionId)) return;

        this.pausedSessions.add(sessionId);
        logger.info('Session paused - signals skipped', { service: 'SignalStore', sessionId });
        this.emit('session_paused', sessionId);

        // Cancel all active signals for this session
        const signalIds = this.sessionSignals.get(sessionId);
        if (signalIds) {
            for (const id of signalIds) {
                const signal = this.signals.get(id);
                if (signal && signal.status === 'ACTIVE') {
                    signal.status = 'CANCELLED';
                }
            }
        }
    }

    resumeSession(sessionId: string): void {
        if (!this.pausedSessions.has(sessionId)) return;

        this.pausedSessions.delete(sessionId);
        logger.info('Session resumed', { service: 'SignalStore', sessionId });
        this.emit('session_resumed', sessionId);
    }

    isSessionPaused(sessionId: string): boolean {
        return this.pausedSessions.has(sessionId);
    }

    shouldProcessTicks(sessionId: string): boolean {
        if (this.pausedSessions.has(sessionId)) return false;

        const session = sessionRegistry.getSessionState(sessionId);
        return session !== null && (session.status === 'RUNNING' || session.status === 'ACTIVE');
    }

    // ---------------------------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------------------------

    private cleanupExpiredSignals(): void {
        const now = Date.now();
        let expiredCount = 0;

        for (const [id, signal] of this.signals) {
            if (signal.status === 'ACTIVE' && signal.expiresAt <= now) {
                signal.status = 'EXPIRED';
                expiredCount++;
                this.emit('signal_expired', signal);
            }
        }

        if (expiredCount > 0) {
            logger.info('Expired signals', { service: 'SignalStore', count: expiredCount });
        }

        // Prune old signals (keep last hour)
        const oneHourAgo = now - 3600000;
        for (const [id, signal] of this.signals) {
            if (signal.createdAt < oneHourAgo && signal.status !== 'ACTIVE') {
                this.signals.delete(id);
                const sessionSignals = this.sessionSignals.get(signal.sessionId);
                sessionSignals?.delete(id);
            }
        }
    }

    clearSession(sessionId: string): void {
        const signalIds = this.sessionSignals.get(sessionId);
        if (signalIds) {
            for (const id of signalIds) {
                this.signals.delete(id);
            }
            this.sessionSignals.delete(sessionId);
        }
        this.pausedSessions.delete(sessionId);
        logger.info('Cleared all signals for session', { service: 'SignalStore', sessionId });
    }

    // ---------------------------------------------------------------------------
    // STATS
    // ---------------------------------------------------------------------------

    getSessionStats(sessionId: string): SessionSignalStats {
        const signalIds = this.sessionSignals.get(sessionId) ?? new Set();
        let active = 0, expired = 0, executed = 0;

        for (const id of signalIds) {
            const signal = this.signals.get(id);
            if (!signal) continue;

            switch (signal.status) {
                case 'ACTIVE': active++; break;
                case 'EXPIRED': expired++; break;
                case 'EXECUTED': executed++; break;
            }
        }

        return {
            sessionId,
            totalSignals: signalIds.size,
            activeSignals: active,
            expiredSignals: expired,
            executedSignals: executed,
        };
    }

    getStats(): { totalSignals: number; activeSessions: number; pausedSessions: number } {
        return {
            totalSignals: this.signals.size,
            activeSessions: this.sessionSignals.size,
            pausedSessions: this.pausedSessions.size,
        };
    }
}

// Export singleton
export const signalStore = new SignalStore();
