/**
 * TraderMind QuantEngine Adapter
 * Pipes normalized ticks from MarketDataService to QuantEngine
 */

import { EventEmitter } from 'eventemitter3';
import { MarketDataService, NormalizedTick, NormalizedTickSchema } from './MarketDataService.js';
import { QuantEngine, Signal, SessionConfig } from './QuantEngine.js';
import { logger } from '../utils/logger.js';

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
    private aiStatusTimer: NodeJS.Timeout | null = null;
    private _isRunning = false;
    private activeConfig: SessionConfig | undefined;

    // Stats
    private ticksReceived = 0;
    private ticksProcessed = 0;
    private ticksDropped = 0;
    private signalsGenerated = 0;
    private lastTickTime: number | null = null;

    constructor(
        private marketDataService: MarketDataService,
        private quantEngine: QuantEngine
    ) {
        super();
        logger.info('Initialized', { service: 'QuantAdapter' });
    }

    // ---------------------------------------------------------------------------
    // LIFECYCLE
    // ---------------------------------------------------------------------------

    // Stored listener references for cleanup
    private boundHandlers: {
        tickReceived?: (tick: NormalizedTick) => void;
        signal?: (signal: Signal) => void;
    } = {};

    start(config?: SessionConfig): void {
        if (this._isRunning) return;
        this._isRunning = true;
        this.activeConfig = config;

        // Create and store bound handlers for later removal
        this.boundHandlers.tickReceived = this.handleTickReceived.bind(this);
        this.boundHandlers.signal = (signal: Signal) => {
            this.signalsGenerated++;
            this.emit('signal', signal);
        };

        // Subscribe to MarketDataService ticks
        this.marketDataService.on('tick_received', this.boundHandlers.tickReceived);

        // Wire QuantEngine signals
        this.quantEngine.on('signal', this.boundHandlers.signal);

        // Start batch processor
        this.processTimer = setInterval(() => {
            this.processBatch();
        }, BATCH_PROCESS_INTERVAL);

        // AI layer has been removed from this codebase
        this.quantEngine.setAIEnabled(false);

        logger.info('Started', { service: 'QuantAdapter' });
    }

    stop(): void {
        if (!this._isRunning) return;
        this._isRunning = false;

        // Remove event listeners to prevent memory leaks
        if (this.boundHandlers.tickReceived) {
            this.marketDataService.off('tick_received', this.boundHandlers.tickReceived);
        }
        if (this.boundHandlers.signal) {
            this.quantEngine.off('signal', this.boundHandlers.signal);
        }

        // Clear handler references
        this.boundHandlers = {};

        if (this.processTimer) {
            clearInterval(this.processTimer);
            this.processTimer = null;
        }
        if (this.aiStatusTimer) {
            clearInterval(this.aiStatusTimer);
            this.aiStatusTimer = null;
        }

        this.tickQueue = [];
        logger.info('Stopped', { service: 'QuantAdapter' });
    }

    updateConfig(config: SessionConfig): void {
        this.activeConfig = config;
        logger.info('Config updated', { service: 'QuantAdapter' });
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
            logger.warn('Tick dropped: validation failed', { service: 'QuantAdapter', issues: validation.error.issues });
            this.emit('tick_dropped', tick, 'validation_failed');
            return;
        }

        // Check queue overflow
        if (this.tickQueue.length >= MAX_QUEUE_SIZE) {
            // Drop oldest ticks
            const dropped = this.tickQueue.splice(0, 10);
            this.ticksDropped += dropped.length;
            logger.warn('Queue overflow, dropped old ticks', { service: 'QuantAdapter', droppedCount: dropped.length });
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
            const signal = this.quantEngine.processTick(tick, this.activeConfig);

            this.ticksProcessed++;

            if (signal) {
                // Signal is emitted by QuantEngine internally
                logger.info('Signal generated', { service: 'QuantAdapter', type: signal.type, market: signal.market });
            }
        } catch (err) {
            this.ticksDropped++;
            logger.error('Error processing tick', { service: 'QuantAdapter' }, err instanceof Error ? err : undefined);
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

        const signal = this.quantEngine.processTick(tick, this.activeConfig);
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
        const AI_LAYER_URL = process.env.AI_LAYER_URL || 'http://localhost:8001';

        try {
            // Use built-in fetch (Node 18+)
            const response = await fetch(`${AI_LAYER_URL}/model/info`, {
                signal: AbortSignal.timeout(2000)
            });

            if (response.ok) {
                const data = await response.json() as any;
                // If status is specifically DISABLED, respect it. Otherwise assume active.
                if (data.status === 'DISABLED') {
                    this.quantEngine.setAIEnabled(false);
                } else {
                    this.quantEngine.setAIEnabled(true);
                }
            } else {
                // Service reachable but returned error? logic debatable. 
                // We'll keep current state or maybe warn.
                logger.warn('AI Health Check failed', { service: 'QuantAdapter', status: response.status });
            }
        } catch (_err) {
            // Network error implies AI is down
            logger.warn('AI Layer unreachable, disabling AI scoring temporarily', { service: 'QuantAdapter' });
            this.quantEngine.setAIEnabled(false);
        }
    }

    isHealthy(): boolean {
        if (!this._isRunning) return false;

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

    isRunning(): boolean {
        return this._isRunning;
    }
}


