/**
 * TraderMind QuantEngine
 * Signal generation with technical indicators
 */

import { EventEmitter } from 'eventemitter3';
import { NormalizedTick } from './MarketDataService.js';
import { FeatureBuilder } from './FeatureBuilder.js';
import { AIServiceAdapter } from './AIServiceAdapter.js';

// =============================================================================
// TYPES
// =============================================================================

export type SignalType = 'CALL' | 'PUT';

export type SignalReason =
    | 'RSI_OVERSOLD'
    | 'RSI_OVERBOUGHT'
    | 'EMA_CROSS_UP'
    | 'EMA_CROSS_DOWN'
    | 'MOMENTUM_SHIFT'
    | 'VOLATILITY_SPIKE'
    | 'NO_SIGNAL';

export interface Signal {
    type: SignalType;
    confidence: number;
    reason: SignalReason;
    market: string;
    timestamp: string;
}

export interface SessionConfig {
    max_participants?: number;
    min_balance?: number;
    risk_profile?: 'LOW' | 'MEDIUM' | 'HIGH';
    allowed_markets?: string[];
    min_confidence?: number;
}

export interface IndicatorValues {
    rsi: number;
    emaFast: number;
    emaSlow: number;
    momentum: number;
    volatility: number;
}

type QuantEngineEvents = {
    signal: (signal: Signal) => void;
    indicators: (market: string, indicators: IndicatorValues) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const RSI_PERIOD = 14;
const EMA_FAST_PERIOD = 9;
const EMA_SLOW_PERIOD = 21;
const RSI_OVERSOLD = 30;
const RSI_OVERBOUGHT = 70;

// =============================================================================
// QUANT ENGINE
// =============================================================================

export class QuantEngine extends EventEmitter<QuantEngineEvents> {
    private priceHistory: Map<string, number[]> = new Map();
    private emaFastValues: Map<string, number> = new Map();
    private emaSlowValues: Map<string, number> = new Map();
    private prevEmaFast: Map<string, number> = new Map();
    private prevEmaSlow: Map<string, number> = new Map();

    private featureBuilder: FeatureBuilder;
    private aiService: AIServiceAdapter;

    private useAI: boolean = true;

    constructor() {
        super();
        this.featureBuilder = new FeatureBuilder();
        this.aiService = new AIServiceAdapter();
        this.useAI = process.env.USE_AI !== 'false';
        console.log(`[QuantEngine] Initialized with AI Layer integration (Enabled: ${this.useAI})`);
    }

    // ---------------------------------------------------------------------------
    // SIGNAL GENERATION
    // ---------------------------------------------------------------------------

    /**
     * Generate signal from normalized ticks and session config
     */
    async generateSignal(ticks: NormalizedTick[], config?: SessionConfig): Promise<Signal | null> {
        if (ticks.length === 0) {
            return null;
        }

        const latestTick = ticks[ticks.length - 1];
        if (!latestTick) return null;

        const market = latestTick.market;

        // Check if market is allowed
        if (config?.allowed_markets && !config.allowed_markets.includes(market)) {
            return null;
        }

        // Update price history
        this.updatePriceHistory(market, ticks);

        // Calculate indicators
        const indicators = this.calculateIndicators(market);
        this.emit('indicators', market, indicators);

        // Generate base rule-based signal
        let signal = this.evaluateIndicators(market, indicators, config);

        // Apply AI Overlay if signal exists
        if (signal) {
            const prices = this.priceHistory.get(market) ?? [];
            signal = await this.overlayAI(signal, prices);
        }

        if (signal) {
            this.emit('signal', signal);
        }

        return signal;
    }

    /**
     * Process single tick (for real-time use)
     */
    async processTick(tick: NormalizedTick, config?: SessionConfig): Promise<Signal | null> {
        const market = tick.market;

        // Add to history
        const history = this.priceHistory.get(market) ?? [];
        history.push(tick.quote);

        // Keep only last 100 prices
        if (history.length > 100) {
            history.shift();
        }
        this.priceHistory.set(market, history);

        // Need minimum history for indicators
        if (history.length < EMA_SLOW_PERIOD + 5) {
            return null;
        }

        // Calculate indicators
        const indicators = this.calculateIndicators(market);
        this.emit('indicators', market, indicators);

        // Evaluate for signal
        let signal = this.evaluateIndicators(market, indicators, config);

        // Apply AI Overlay if signal exists
        if (signal) {
            // Use price history directly (FeatureBuilder now supports number[])
            const prices = this.priceHistory.get(market) ?? [];
            signal = await this.overlayAI(signal, prices);
        }

        if (signal) {
            this.emit('signal', signal);
        }

        return signal;
    }

    // ---------------------------------------------------------------------------
    // AI OVERLAY
    // ---------------------------------------------------------------------------

    private async overlayAI(signal: Signal, prices: number[]): Promise<Signal | null> {
        // Kill Switch Check
        if (!this.useAI) {
            console.log('[Audit] AI Disabled via USE_AI check. Returning rule-based signal.');
            return signal;
        }

        try {
            // 1. Build deterministic features
            const features = this.featureBuilder.buildFeatures(prices);

            // 2. Call AI Service (Safe fallback ensures null on failure)
            const aiResult = await this.aiService.getInference(features);

            if (!aiResult) {
                console.warn('[QuantEngine] AI failed or unavailable. Falling back to rule-based signal.');
                console.log('[Audit] Fallback triggered. Reason: AI Service Unresponsive.');
                return signal;
            }

            // Initialize metadata if not present
            if (!signal.metadata) {
                signal.metadata = {};
            }

            const tags: string[] = [];

            // 3. Apply Decision Logic & Generate Tags
            const aiConf = aiResult.ai_confidence;
            const regime = aiResult.market_regime;

            signal.metadata.ai_confidence = aiConf;
            signal.metadata.market_regime = regime;

            // Audit Object
            const auditLog = {
                timestamp: new Date().toISOString(),
                features,
                aiResult,
                baseSignal: signal,
                decision: 'PENDING'
            };

            // Block Checks
            if (aiConf < 0.4) {
                console.log('[QuantEngine] Blocked by AI: Low Confidence');
                auditLog.decision = 'BLOCKED_LOW_CONFIDENCE';
                console.log(`[Audit] Decision: ${auditLog.decision}`, JSON.stringify(auditLog));
                return null;
            }

            if (regime === 'VOLATILE' && signal.confidence < 0.8) {
                console.log('[QuantEngine] Blocked by AI: Volatile Regime');
                auditLog.decision = 'BLOCKED_VOLATILE';
                console.log(`[Audit] Decision: ${auditLog.decision}`, JSON.stringify(auditLog));
                return null;
            }

            // If we survive, we are either CONFIRMED or WEAK
            if (aiConf >= 0.6) {
                tags.push(`ML_CONFIRMED_${signal.type}`);
            } else {
                tags.push('ML_WEAK_CONFIDENCE');
            }

            // Adjust Confidence
            signal.confidence = (signal.confidence + aiConf) / 2;
            signal.confidence = Math.min(1, Math.max(0, signal.confidence));

            // Store tags
            signal.metadata.reason_tags = tags;

            auditLog.decision = 'APPROVED';
            // We log the final signal too
            console.log(`[Audit] Decision: ${auditLog.decision}`, JSON.stringify({ ...auditLog, finalSignal: signal }));

            return signal;

        } catch (error) {
            console.error('[QuantEngine] Error in AI Overlay:', error);
            // Fallback
            return signal;
        }
    }

    // ---------------------------------------------------------------------------
    // INDICATOR CALCULATIONS
    // ---------------------------------------------------------------------------

    private updatePriceHistory(market: string, ticks: NormalizedTick[]): void {
        const history = this.priceHistory.get(market) ?? [];

        for (const tick of ticks) {
            history.push(tick.quote);
        }

        // Keep only last 100 prices
        while (history.length > 100) {
            history.shift();
        }

        this.priceHistory.set(market, history);
    }

    private calculateIndicators(market: string): IndicatorValues {
        const prices = this.priceHistory.get(market) ?? [];

        const rsi = this.calculateRSI(prices);
        const emaFast = this.calculateEMA(prices, EMA_FAST_PERIOD);
        const emaSlow = this.calculateEMA(prices, EMA_SLOW_PERIOD);
        const momentum = this.calculateMomentum(prices);
        const volatility = this.calculateVolatility(prices);

        // Store for crossover detection
        this.prevEmaFast.set(market, this.emaFastValues.get(market) ?? emaFast);
        this.prevEmaSlow.set(market, this.emaSlowValues.get(market) ?? emaSlow);
        this.emaFastValues.set(market, emaFast);
        this.emaSlowValues.set(market, emaSlow);

        return { rsi, emaFast, emaSlow, momentum, volatility };
    }

    private calculateRSI(prices: number[]): number {
        if (prices.length < RSI_PERIOD + 1) {
            return 50; // Neutral
        }

        const changes: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            const prev = prices[i - 1];
            const curr = prices[i];
            if (prev !== undefined && curr !== undefined) {
                changes.push(curr - prev);
            }
        }

        const recentChanges = changes.slice(-RSI_PERIOD);
        let gains = 0;
        let losses = 0;

        for (const change of recentChanges) {
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        const avgGain = gains / RSI_PERIOD;
        const avgLoss = losses / RSI_PERIOD;

        if (avgLoss === 0) {
            return 100;
        }

        const rs = avgGain / avgLoss;
        return 100 - 100 / (1 + rs);
    }

    private calculateEMA(prices: number[], period: number): number {
        if (prices.length < period) {
            const price = prices[prices.length - 1];
            return price ?? 0;
        }

        const multiplier = 2 / (period + 1);
        let ema = 0;

        // Initialize with SMA
        for (let i = 0; i < period; i++) {
            ema += prices[i] ?? 0;
        }
        ema /= period;

        // Calculate EMA
        for (let i = period; i < prices.length; i++) {
            const price = prices[i] ?? 0;
            ema = (price - ema) * multiplier + ema;
        }

        return ema;
    }

    private calculateMomentum(prices: number[]): number {
        if (prices.length < 10) {
            return 0;
        }

        const current = prices[prices.length - 1] ?? 0;
        const past = prices[prices.length - 10] ?? current;

        return (current - past) / past;
    }

    private calculateVolatility(prices: number[]): number {
        if (prices.length < 10) {
            return 0;
        }

        const recentPrices = prices.slice(-20);
        const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / recentPrices.length;

        return Math.sqrt(variance) / mean; // Coefficient of variation
    }

    // ---------------------------------------------------------------------------
    // SIGNAL EVALUATION
    // ---------------------------------------------------------------------------

    private evaluateIndicators(
        market: string,
        indicators: IndicatorValues,
        config?: SessionConfig
    ): Signal | null {
        const { rsi, emaFast, emaSlow, momentum, volatility } = indicators;
        const minConfidence = config?.min_confidence ?? 0.6;

        let type: SignalType | null = null;
        let reason: SignalReason = 'NO_SIGNAL';
        let confidence = 0;

        // RSI signals
        if (rsi < RSI_OVERSOLD) {
            type = 'CALL';
            reason = 'RSI_OVERSOLD';
            confidence = (RSI_OVERSOLD - rsi) / RSI_OVERSOLD * 0.8 + 0.2;
        } else if (rsi > RSI_OVERBOUGHT) {
            type = 'PUT';
            reason = 'RSI_OVERBOUGHT';
            confidence = (rsi - RSI_OVERBOUGHT) / (100 - RSI_OVERBOUGHT) * 0.8 + 0.2;
        }

        // EMA crossover signals (stronger than RSI)
        const prevFast = this.prevEmaFast.get(market) ?? emaFast;
        const prevSlow = this.prevEmaSlow.get(market) ?? emaSlow;

        // Bullish crossover: fast crosses above slow
        if (prevFast <= prevSlow && emaFast > emaSlow) {
            type = 'CALL';
            reason = 'EMA_CROSS_UP';
            confidence = Math.min(0.95, 0.7 + Math.abs(momentum) * 2);
        }
        // Bearish crossover: fast crosses below slow
        else if (prevFast >= prevSlow && emaFast < emaSlow) {
            type = 'PUT';
            reason = 'EMA_CROSS_DOWN';
            confidence = Math.min(0.95, 0.7 + Math.abs(momentum) * 2);
        }

        // Adjust confidence based on volatility
        if (volatility > 0.02) {
            confidence *= 0.9; // High volatility = less confident
        }

        // Check minimum confidence
        if (!type || confidence < minConfidence) {
            return null;
        }

        // Clamp confidence
        confidence = Math.min(1, Math.max(0, confidence));

        return {
            type,
            confidence,
            reason,
            market,
            timestamp: new Date().toISOString(),
        };
    }

    // ---------------------------------------------------------------------------
    // UTILITIES
    // ---------------------------------------------------------------------------

    /**
     * Clear history for a market
     */
    clearHistory(market: string): void {
        this.priceHistory.delete(market);
        this.emaFastValues.delete(market);
        this.emaSlowValues.delete(market);
        this.prevEmaFast.delete(market);
        this.prevEmaSlow.delete(market);
    }

    /**
     * Get stats
     */
    getStats(): { markets: string[]; historySize: Record<string, number> } {
        const historySize: Record<string, number> = {};
        for (const [market, prices] of this.priceHistory) {
            historySize[market] = prices.length;
        }
        return {
            markets: Array.from(this.priceHistory.keys()),
            historySize,
        };
    }
}

// Export singleton instance
export const quantEngine = new QuantEngine();
