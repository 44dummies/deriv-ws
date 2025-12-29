/**
 * TraderMind MarketDataService
 * Normalizes raw ticks, deduplicates, and emits internal events
 */

import { EventEmitter } from 'eventemitter3';
import { z } from 'zod';
import { derivWSClient, Tick } from './DerivWSClient.js';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const NormalizedTickSchema = z.object({
    market: z.string(),
    timestamp: z.number(),
    bid: z.number().positive(),
    ask: z.number().positive(),
    quote: z.number().positive(),
    spread: z.number().nonnegative(),
    volatility: z.number().nonnegative(),
});

export type NormalizedTick = z.infer<typeof NormalizedTickSchema>;

export const RawTickSchema = z.object({
    market: z.string(),
    bid: z.number(),
    ask: z.number(),
    quote: z.number(),
    timestamp: z.string(),
    epoch: z.number(),
});

// =============================================================================
// TYPES
// =============================================================================

export interface MarketStats {
    market: string;
    tickCount: number;
    duplicatesRejected: number;
    lastTick: number;
    avgSpread: number;
    volatility: number;
}

export interface DedupeStats {
    totalReceived: number;
    totalEmitted: number;
    totalDuplicates: number;
    dedupeRatio: number;
}

type MarketDataEvents = {
    tick_received: (tick: NormalizedTick) => void;
    tick_deduplicated: (tick: NormalizedTick, dedupedCount: number) => void;
    heartbeat_failed: (market: string) => void;
    anomaly: (type: string, details: Record<string, unknown>) => void;
    market_resumed: (market: string) => void;
    subscribed: (market: string) => void;
    unsubscribed: (market: string) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const VOLATILITY_WINDOW = 20;
const TICK_BUFFER_SIZE = 100;
const TICK_TIMEOUT_MS = 10000;
const MIN_VALID_PRICE = 0.0001;
const MAX_SPREAD_RATIO = 0.1;
const DEDUPE_WINDOW_MS = 1000; // 1 second dedup window

// =============================================================================
// MARKET DATA SERVICE
// =============================================================================

export class MarketDataService extends EventEmitter<MarketDataEvents> {
    private priceHistory: Map<string, number[]> = new Map();
    private tickBuffer: Map<string, NormalizedTick[]> = new Map();
    private seenTickHashes: Map<string, Set<string>> = new Map();
    private marketStats: Map<string, MarketStats> = new Map();
    private lastTickTime: Map<string, number> = new Map();
    private lastEpoch: Map<string, number> = new Map();
    private tickTimeoutTimers: Map<string, NodeJS.Timeout> = new Map();
    private activeSubscriptions: Set<string> = new Set();
    private isRunning = false;
    private totalReceived = 0;
    private totalDuplicates = 0;

    constructor() {
        super();
        console.log('[MarketDataService] Initialized');
    }

    // ---------------------------------------------------------------------------
    // LIFECYCLE
    // ---------------------------------------------------------------------------

    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        derivWSClient.on('tick', (tick: Tick) => this.handleTick(tick));
        derivWSClient.on('heartbeat', () => this.handleHeartbeat());
        derivWSClient.on('circuitBreaker', (reason: string) => this.handleCircuitBreaker(reason));
        derivWSClient.on('disconnected', (reason: string) => this.handleDisconnect(reason));
        derivWSClient.on('subscribed', (market: string) => {
            this.activeSubscriptions.add(market);
            this.emit('subscribed', market);
            console.log(`[MarketDataService] Subscribed to: ${market}`);
        });
        derivWSClient.on('unsubscribed', (market: string) => {
            this.activeSubscriptions.delete(market);
            this.emit('unsubscribed', market);
            console.log(`[MarketDataService] Unsubscribed from: ${market}`);
        });

        derivWSClient.connect();
        console.log('[MarketDataService] Started');
    }

    stop(): void {
        if (!this.isRunning) return;
        this.isRunning = false;

        for (const timer of this.tickTimeoutTimers.values()) {
            clearTimeout(timer);
        }
        this.tickTimeoutTimers.clear();
        this.activeSubscriptions.clear();

        derivWSClient.disconnect();
        console.log('[MarketDataService] Stopped');
    }

    // ---------------------------------------------------------------------------
    // SUBSCRIPTION MANAGEMENT
    // ---------------------------------------------------------------------------

    subscribe(market: string): void {
        if (this.activeSubscriptions.has(market)) {
            console.log(`[MarketDataService] Already subscribed to: ${market}`);
            return;
        }
        derivWSClient.subscribe(market);
    }

    unsubscribe(market: string): void {
        if (!this.activeSubscriptions.has(market)) {
            console.log(`[MarketDataService] Not subscribed to: ${market}`);
            return;
        }

        derivWSClient.unsubscribe(market);

        // Clear market data
        this.priceHistory.delete(market);
        this.tickBuffer.delete(market);
        this.seenTickHashes.delete(market);
        this.marketStats.delete(market);
        this.lastTickTime.delete(market);

        const timer = this.tickTimeoutTimers.get(market);
        if (timer) {
            clearTimeout(timer);
            this.tickTimeoutTimers.delete(market);
        }
    }

    getActiveSubscriptions(): string[] {
        return Array.from(this.activeSubscriptions);
    }

    subscribeToDefaults(): void {
        this.subscribe('R_100');
        this.subscribe('R_50');
    }

    // ---------------------------------------------------------------------------
    // TICK HANDLING
    // ---------------------------------------------------------------------------

    private handleTick(rawTick: Tick): void {
        this.totalReceived++;
        const market = rawTick.market;

        // Validate raw tick
        const validation = RawTickSchema.safeParse(rawTick);
        if (!validation.success) {
            this.logAnomaly('invalid_tick_format', { market, errors: validation.error.issues });
            return;
        }

        // Check for duplicate
        if (this.isDuplicate(rawTick)) {
            this.totalDuplicates++;
            this.incrementDuplicateCount(market);
            return;
        }

        // Check for out-of-order
        const lastEpoch = this.lastEpoch.get(market) ?? 0;
        if (rawTick.epoch < lastEpoch) {
            this.logAnomaly('out_of_order_tick', { market, epoch: rawTick.epoch, lastEpoch });
            return;
        }
        this.lastEpoch.set(market, rawTick.epoch);

        // Validate price sanity
        if (!this.validatePrices(rawTick)) {
            return;
        }

        this.resetTickTimeout(market);
        const normalizedTick = this.normalizeTick(rawTick);

        const normalizedValidation = NormalizedTickSchema.safeParse(normalizedTick);
        if (!normalizedValidation.success) {
            this.logAnomaly('normalization_failed', { market, errors: normalizedValidation.error.issues });
            return;
        }

        // Add to buffer
        this.addToBuffer(market, normalizedTick);

        // Update stats
        this.updateStats(market, normalizedTick);

        // Get dedupe count for this market
        const stats = this.marketStats.get(market);
        const dedupedCount = stats?.duplicatesRejected ?? 0;

        // Emit events
        this.emit('tick_received', normalizedTick);
        this.emit('tick_deduplicated', normalizedTick, dedupedCount);
    }

    // ---------------------------------------------------------------------------
    // DEDUPLICATION
    // ---------------------------------------------------------------------------

    private isDuplicate(tick: Tick): boolean {
        const market = tick.market;
        const hash = this.createTickHash(tick);

        let hashes = this.seenTickHashes.get(market);
        if (!hashes) {
            hashes = new Set();
            this.seenTickHashes.set(market, hashes);
        }

        if (hashes.has(hash)) {
            return true;
        }

        hashes.add(hash);

        // Clean old hashes (keep only recent window)
        this.cleanOldHashes(market, tick.epoch * 1000);

        return false;
    }

    private createTickHash(tick: Tick): string {
        return `${tick.market}:${tick.epoch}:${tick.quote.toFixed(5)}`;
    }

    private cleanOldHashes(market: string, currentTime: number): void {
        const hashes = this.seenTickHashes.get(market);
        if (!hashes || hashes.size < 100) return;

        // Keep only last 50 hashes when buffer grows
        const arr = Array.from(hashes);
        const toKeep = arr.slice(-50);
        this.seenTickHashes.set(market, new Set(toKeep));
    }

    private incrementDuplicateCount(market: string): void {
        let stats = this.marketStats.get(market);
        if (!stats) {
            stats = { market, tickCount: 0, duplicatesRejected: 0, lastTick: 0, avgSpread: 0, volatility: 0 };
            this.marketStats.set(market, stats);
        }
        stats.duplicatesRejected++;
    }

    // ---------------------------------------------------------------------------
    // ROLLING BUFFER
    // ---------------------------------------------------------------------------

    private addToBuffer(market: string, tick: NormalizedTick): void {
        let buffer = this.tickBuffer.get(market);
        if (!buffer) {
            buffer = [];
            this.tickBuffer.set(market, buffer);
        }

        buffer.push(tick);

        // Keep only last N ticks
        while (buffer.length > TICK_BUFFER_SIZE) {
            buffer.shift();
        }
    }

    getTickBuffer(market: string): NormalizedTick[] {
        return [...(this.tickBuffer.get(market) ?? [])];
    }

    getLastTicks(market: string, count: number): NormalizedTick[] {
        const buffer = this.tickBuffer.get(market) ?? [];
        return buffer.slice(-count);
    }

    // ---------------------------------------------------------------------------
    // VALIDATION & NORMALIZATION
    // ---------------------------------------------------------------------------

    private validatePrices(tick: Tick): boolean {
        const { market, quote, bid, ask } = tick;

        if (quote < MIN_VALID_PRICE || bid < MIN_VALID_PRICE || ask < MIN_VALID_PRICE) {
            this.logAnomaly('invalid_price', { market, quote, bid, ask, reason: 'below_minimum' });
            return false;
        }

        const spread = ask - bid;
        const spreadRatio = spread / quote;
        if (spreadRatio > MAX_SPREAD_RATIO) {
            this.logAnomaly('excessive_spread', { market, spread, spreadRatio, maxAllowed: MAX_SPREAD_RATIO });
            return false;
        }

        if (bid >= ask) {
            this.logAnomaly('invalid_spread', { market, bid, ask, reason: 'bid >= ask' });
            return false;
        }

        return true;
    }

    private normalizeTick(tick: Tick): NormalizedTick {
        const market = tick.market;
        const timestamp = tick.epoch * 1000;
        const { quote, bid, ask } = tick;
        const spread = ask - bid;
        const volatility = this.calculateVolatility(market, quote);

        return { market, timestamp, bid, ask, quote, spread, volatility };
    }

    private calculateVolatility(market: string, price: number): number {
        let history = this.priceHistory.get(market);
        if (!history) {
            history = [];
            this.priceHistory.set(market, history);
        }

        history.push(price);
        if (history.length > VOLATILITY_WINDOW) history.shift();
        if (history.length < 2) return 0;

        const returns: number[] = [];
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];
            if (prev && curr && prev > 0) {
                returns.push((curr - prev) / prev);
            }
        }

        if (returns.length === 0) return 0;

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(252 * 24 * 60 * 60);
    }

    // ---------------------------------------------------------------------------
    // TIMEOUT / ANOMALY HANDLING
    // ---------------------------------------------------------------------------

    private resetTickTimeout(market: string): void {
        const existing = this.tickTimeoutTimers.get(market);
        if (existing) clearTimeout(existing);

        const lastTick = this.lastTickTime.get(market);
        const now = Date.now();
        if (lastTick && now - lastTick > TICK_TIMEOUT_MS) {
            console.log(`[MarketDataService] Market ${market} resumed after timeout`);
            this.emit('market_resumed', market);
        }

        this.lastTickTime.set(market, now);

        const timer = setTimeout(() => this.handleTickTimeout(market), TICK_TIMEOUT_MS);
        this.tickTimeoutTimers.set(market, timer);
    }

    private handleTickTimeout(market: string): void {
        const lastTick = this.lastTickTime.get(market);
        const elapsed = lastTick ? Date.now() - lastTick : TICK_TIMEOUT_MS;
        this.logAnomaly('tick_timeout', { market, elapsed, threshold: TICK_TIMEOUT_MS });
        this.emit('heartbeat_failed', market);
    }

    private handleHeartbeat(): void { }

    private handleCircuitBreaker(reason: string): void {
        console.error(`[MarketDataService] Circuit breaker: ${reason}`);
        this.logAnomaly('circuit_breaker', { reason });
        for (const market of this.activeSubscriptions) {
            this.emit('heartbeat_failed', market);
        }
    }

    private handleDisconnect(reason: string): void {
        console.log(`[MarketDataService] Disconnected: ${reason}`);
    }

    private logAnomaly(type: string, details: Record<string, unknown>): void {
        console.warn(`[MarketDataService] ANOMALY: ${type}`, details);
        this.emit('anomaly', type, details);
    }

    // ---------------------------------------------------------------------------
    // STATS
    // ---------------------------------------------------------------------------

    private updateStats(market: string, tick: NormalizedTick): void {
        let stats = this.marketStats.get(market);
        if (!stats) {
            stats = { market, tickCount: 0, duplicatesRejected: 0, lastTick: 0, avgSpread: 0, volatility: 0 };
            this.marketStats.set(market, stats);
        }

        stats.tickCount++;
        stats.lastTick = tick.timestamp;
        stats.volatility = tick.volatility;
        stats.avgSpread = (stats.avgSpread * (stats.tickCount - 1) + tick.spread) / stats.tickCount;
    }

    getStats(): Map<string, MarketStats> {
        return new Map(this.marketStats);
    }

    getMarketStats(market: string): MarketStats | undefined {
        return this.marketStats.get(market);
    }

    getDedupeStats(): DedupeStats {
        const totalEmitted = this.totalReceived - this.totalDuplicates;
        return {
            totalReceived: this.totalReceived,
            totalEmitted,
            totalDuplicates: this.totalDuplicates,
            dedupeRatio: this.totalReceived > 0 ? this.totalDuplicates / this.totalReceived : 0,
        };
    }

    isHealthy(): boolean {
        return this.isRunning && derivWSClient.isConnected();
    }
}

export const marketDataService = new MarketDataService();
