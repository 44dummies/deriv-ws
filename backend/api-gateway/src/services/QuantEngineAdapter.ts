/**
 * TraderMind QuantEngine Adapter
 * Pipes normalized ticks from MarketDataService to QuantEngine
 */

import { EventEmitter } from 'eventemitter3';
import { marketDataService, NormalizedTick, NormalizedTickSchema } from './MarketDataService.js';
import { quantEngine, Signal, SessionConfig } from './QuantEngine.js';

// =============================================================================
// TYPES
// =============================================================================

export interface AdapterStats {
    ticksReceived: number;
    ticksProcessed: number;
    ticksDropped: number;
    signalsGenerated: number;
    lastTickTime: number | null;
    queueLength: number;
}

type QuantAdapterEvents = {
    new_tick: (tick: NormalizedTick) => void;
    tick_dropped: (tick: NormalizedTick, reason: string) => void;
    signal: (signal: Signal) => void;
    queue_overflow: (droppedCount: number) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_QUEUE_SIZE = 100;
const BATCH_PROCESS_INTERVAL = 50; // ms

// =============================================================================
// QUANT ENGINE ADAPTER
// =============================================================================

export class QuantEngineAdapter extends EventEmitter<QuantAdapterEvents> {
    private tickQueue: NormalizedTick[] = [];
    private isProcessing = false;
    private processTimer: NodeJS.Timeout | null = null;
    private isRunning = false;
    private activeConfig: SessionConfig | undefined;

    // Stats
    private ticksReceived = 0;
    private ticksProcessed = 0;
    private ticksDropped = 0;
    private signalsGenerated = 0;
    private lastTickTime: number | null = null;

    constructor() {
        super();
        console.log('[QuantAdapter] Initialized');
    }

    // ---------------------------------------------------------------------------
    // LIFECYCLE
    // ---------------------------------------------------------------------------

    start(config?: SessionConfig): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.activeConfig = config;

        // Subscribe to MarketDataService ticks
        marketDataService.on('tick_received', this.handleTickReceived.bind(this));

        // Wire QuantEngine signals
        quantEngine.on('signal', (signal: Signal) => {
            this.signalsGenerated++;
            this.emit('signal', signal);
        });

        // Start batch processor
        this.processTimer = setInterval(() => {
            this.processBatch();
        }, BATCH_PROCESS_INTERVAL);

        // Start Status Poller (every 5 seconds)
        setInterval(() => {
            this.checkAIStatus();
        }, 5000);

        console.log('[QuantAdapter] Started');
    }

    stop(): void {
        if (!this.isRunning) return;
        this.isRunning = false;

        if (this.processTimer) {
            clearInterval(this.processTimer);
            this.processTimer = null;
        }

        this.tickQueue = [];
        console.log('[QuantAdapter] Stopped');
    }

    updateConfig(config: SessionConfig): void {
        this.activeConfig = config;
        console.log('[QuantAdapter] Config updated');
    }

    // ---------------------------------------------------------------------------
    // TICK HANDLING
    // ---------------------------------------------------------------------------

    private handleTickReceived(tick: NormalizedTick): void {
        this.ticksReceived++;
        this.lastTickTime = Date.now();

        // Validate with Zod schema
        const validation = NormalizedTickSchema.safeParse(tick);
        if (!validation.success) {
            this.ticksDropped++;
            console.warn('[QuantAdapter] Tick dropped: validation failed', validation.error.issues);
            this.emit('tick_dropped', tick, 'validation_failed');
            return;
        }

        // Check queue overflow
        if (this.tickQueue.length >= MAX_QUEUE_SIZE) {
            // Drop oldest ticks
            const dropped = this.tickQueue.splice(0, 10);
            this.ticksDropped += dropped.length;
            console.warn(`[QuantAdapter] Queue overflow, dropped ${dropped.length} old ticks`);
            this.emit('queue_overflow', dropped.length);
        }

        // Add to queue
        this.tickQueue.push(tick);
    }

    // ---------------------------------------------------------------------------
    // BATCH PROCESSING
    // ---------------------------------------------------------------------------

    private processBatch(): void {
        if (this.isProcessing || this.tickQueue.length === 0) return;
        this.isProcessing = true;

        try {
            // Process all queued ticks
            while (this.tickQueue.length > 0) {
                const tick = this.tickQueue.shift();
                if (!tick) break;

                this.processOneTick(tick);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private processOneTick(tick: NormalizedTick): void {
        try {
            // Emit new_tick event
            this.emit('new_tick', tick);

            // Process through QuantEngine
            const signal = quantEngine.processTick(tick, this.activeConfig);

            this.ticksProcessed++;

            if (signal) {
                // Signal is emitted by QuantEngine internally
                console.log(`[QuantAdapter] Signal generated: ${signal.type} ${signal.market}`);
            }
        } catch (err) {
            this.ticksDropped++;
            console.error('[QuantAdapter] Error processing tick:', err);
            this.emit('tick_dropped', tick, 'processing_error');
        }
    }

    // Process single tick immediately (bypass queue)
    processTickImmediate(tick: NormalizedTick): Signal | null {
        const validation = NormalizedTickSchema.safeParse(tick);
        if (!validation.success) {
            this.ticksDropped++;
            return null;
        }

        this.ticksReceived++;
        this.emit('new_tick', tick);

        const signal = quantEngine.processTick(tick, this.activeConfig);
        this.ticksProcessed++;

        return signal;
    }

    // ---------------------------------------------------------------------------
    // STATS
    // ---------------------------------------------------------------------------

    getStats(): AdapterStats {
        return {
            ticksReceived: this.ticksReceived,
            ticksProcessed: this.ticksProcessed,
            ticksDropped: this.ticksDropped,
            signalsGenerated: this.signalsGenerated,
            lastTickTime: this.lastTickTime,
            queueLength: this.tickQueue.length,
        };
    }

    resetStats(): void {
        this.ticksReceived = 0;
        this.ticksProcessed = 0;
        this.ticksDropped = 0;
        this.signalsGenerated = 0;
        this.lastTickTime = null;
    }


    // ---------------------------------------------------------------------------
    // HEALTH & STATUS CHECK
    // ---------------------------------------------------------------------------

    private async checkAIStatus(): Promise<void> {
        // Read file only in server environment where fs is available
        // Since this runs in Node.js (API Gateway), we can use fs
        // But for portability, we'll use a mocked check or assume external service pushes updates.
        // For Proof of Concept, we attempt to read the file if possible, or skip.
        // Actually, importing 'fs' might break if this code is shared with frontend.
        // Given project structure, 'QuantEngineAdapter' is in 'api-gateway', so it's Node.

        try {
            // Dynamic import to avoid build issues if mixed env
            const fs = await import('fs/promises');
            const path = await import('path');

            // Hardcoded path to config/ai_status.json relative to CWD
            // CWD is likely project root or apps/api-gateway
            // We'll try absolute path or relative to known location
            const statusPath = '/home/dzaddy/Documents/Deriv version 2/apps/ai-layer/config/ai_status.json';

            try {
                const content = await fs.readFile(statusPath, 'utf-8');
                const status = JSON.parse(content);

                if (status.status === 'DISABLED') {
                    quantEngine.setAIEnabled(false);
                } else {
                    quantEngine.setAIEnabled(true);
                }
            } catch (err) {
                // If file doesn't exist, assume enabled (default)
                // console.warn('[QuantAdapter] Status file not found, assuming AI Enabled');
            }
        } catch (err) {
            console.error('[QuantAdapter] Failed to check AI status:', err);
        }
    }

    isHealthy(): boolean {
        if (!this.isRunning) return false;

        // Check if we're receiving ticks
        if (this.lastTickTime && Date.now() - this.lastTickTime > 15000) {
            return false; // No ticks for 15 seconds
        }

        // Check queue health
        if (this.tickQueue.length > MAX_QUEUE_SIZE * 0.8) {
            return false; // Queue almost full
        }

        return true;
    }
}


// Export singleton
export const quantAdapter = new QuantEngineAdapter();
