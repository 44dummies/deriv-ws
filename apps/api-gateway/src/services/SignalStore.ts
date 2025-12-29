/**
 * TraderMind SignalStore
 * Manages signals per session with expiry and cleanup
 */

import { EventEmitter } from 'eventemitter3';
import { Signal } from './QuantEngine.js';
import { sessionRegistry, SessionStatus } from './SessionRegistry.js';

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
        console.log('[SignalStore] Initialized');
    }

    // ---------------------------------------------------------------------------
    // LIFECYCLE
    // ---------------------------------------------------------------------------

    start(): void {
        if (this.cleanupTimer) return;

        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredSignals();
        }, CLEANUP_INTERVAL_MS);

        console.log('[SignalStore] Started cleanup timer');
    }

    stop(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        console.log('[SignalStore] Stopped');
    }

    // ---------------------------------------------------------------------------
    // SIGNAL MANAGEMENT
    // ---------------------------------------------------------------------------

    addSignal(sessionId: string, signal: Signal, ttlMs = DEFAULT_SIGNAL_TTL_MS): StoredSignal | null {
        // Check if session is paused
        if (this.isSessionPaused(sessionId)) {
            console.log(`[SignalStore] Session ${sessionId} is paused, skipping signal`);
            return null;
        }

        // Check session state
        const session = sessionRegistry.getSessionState(sessionId);
        if (!session || (session.status !== 'RUNNING' && session.status !== 'ACTIVE')) {
            console.log(`[SignalStore] Session ${sessionId} not active, skipping signal`);
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

        console.log(`[SignalStore] Added signal ${id} for session ${sessionId} (expires in ${ttlMs}ms)`);
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
        console.log(`[SignalStore] Signal ${signalId} marked as executed`);
        this.emit('signal_executed', signalId);
        return true;
    }

    cancelSignal(signalId: string): boolean {
        const signal = this.signals.get(signalId);
        if (!signal || signal.status !== 'ACTIVE') return false;

        signal.status = 'CANCELLED';
        console.log(`[SignalStore] Signal ${signalId} cancelled`);
        return true;
    }

    // ---------------------------------------------------------------------------
    // SESSION CONTROL
    // ---------------------------------------------------------------------------

    pauseSession(sessionId: string): void {
        if (this.pausedSessions.has(sessionId)) return;

        this.pausedSessions.add(sessionId);
        console.log(`[SignalStore] Session ${sessionId} paused - signals skipped`);
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
        console.log(`[SignalStore] Session ${sessionId} resumed`);
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
            console.log(`[SignalStore] Expired ${expiredCount} signals`);
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
        console.log(`[SignalStore] Cleared all signals for session ${sessionId}`);
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
