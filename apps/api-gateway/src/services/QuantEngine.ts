/**
 * TraderMind QuantEngine
 * Signal generation with technical indicators
 */

import { EventEmitter } from 'eventemitter3';
import { NormalizedTick } from './MarketDataService.js';
import { aiServiceClient, AIInferenceResponse } from './AIServiceClient.js';

// =============================================================================
// TYPES
// =============================================================================

export type SignalType = 'CALL' | 'PUT';

export type SignalReason =
    | 'RSI_OVERSOLD'
    | 'RSI_OVERBOUGHT'
    | 'EMA_CROSS_UP'
    | 'EMA_CROSS_DOWN'
    | 'SMA_CROSS_UP'
    | 'SMA_CROSS_DOWN'
    | 'MOMENTUM_SHIFT'
    | 'VOLATILITY_SPIKE'
    | 'NO_SIGNAL';

export interface Signal {
    type: SignalType;
    confidence: number;
    reason: SignalReason;
    market: string;
    timestamp: string;
    expiry: string;
    metadata?: {
        technicals: IndicatorValues;
        ai_inference?: AIInferenceResponse;
        feature_version?: string;
    };
}



export interface SessionConfig {
    max_participants?: number;
    min_balance?: number;
    risk_profile?: 'LOW' | 'MEDIUM' | 'HIGH';
    allowed_markets?: string[];
    min_confidence?: number;
    useAI?: boolean;
    aiSessionId?: string;
}

export interface IndicatorValues {
    rsi: number;
    emaFast: number;
    emaSlow: number;
    smaFast: number;
    smaSlow: number;
    momentum: number;
    volatility: number;
    atr: number;
}

type QuantEngineEvents = {
    signal: (signal: Signal) => void;
    ai_signal: (signal: Signal, aiResponse: AIInferenceResponse) => void;
    ai_fallback: (reason: string) => void;
    indicators: (market: string, indicators: IndicatorValues) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const RSI_PERIOD = 14;
const EMA_FAST_PERIOD = 9;
const EMA_SLOW_PERIOD = 21;
const SMA_FAST_PERIOD = 10;
const SMA_SLOW_PERIOD = 20;
const ATR_PERIOD = 14;
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

    constructor() {
        super();
        console.log('[QuantEngine] Initialized');
    }

    // ---------------------------------------------------------------------------
    // SIGNAL GENERATION
    // ---------------------------------------------------------------------------

    /**
     * Generate signal from normalized ticks and session config
     */
    generateSignal(ticks: NormalizedTick[], config?: SessionConfig): Signal | null {
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

        // Generate signal based on indicators
        const signal = this.evaluateIndicators(market, indicators, config);

        if (signal) {
            this.emit('signal', signal);
        }

        return signal;
    }

    /**
     * Process single tick (for real-time use)
     */
    /**
     * Process single tick (for real-time use)
     * Optionally uses AI layer if config.useAI is true
     */
    processTick(tick: NormalizedTick, config?: SessionConfig): Signal | null {
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

        // Try AI-enhanced signal if enabled
        if (config?.useAI) {
            // Processing async but not waiting to block tick loop
            this.processTickWithAI(tick, indicators, config).catch(err => {
                console.error('[QuantEngine] AI processing error:', err);
            });
        }

        // Always generate rule-based signal (fallback/primary)
        const signal = this.evaluateIndicators(market, indicators, config);

        if (signal) {
            this.emit('signal', signal);
        }

        return signal;
    }

    /**
     * Process tick with AI enhancement (async)
     * Emits ai_signal on success, ai_fallback on failure
     */
    private async processTickWithAI(
        tick: NormalizedTick,
        indicators: IndicatorValues,
        config: SessionConfig
    ): Promise<void> {
        const sessionId = config.aiSessionId ?? 'default';

        try {
            const aiResponse = await aiServiceClient.infer(
                indicators,
                tick.market,
                sessionId
            );

            if (aiResponse) {
                const aiSignal = aiServiceClient.convertToSignal(aiResponse, tick.market);

                if (aiSignal) {
                    // Enrich with Technicals & AI Metadata
                    // Enrich with Technicals & AI Metadata
                    aiSignal.metadata = {
                        technicals: JSON.parse(JSON.stringify(indicators)), // Feature Freeze v1
                        ai_inference: aiResponse,
                        feature_version: 'v1'
                    };

                    // Check minimum confidence
                    const minConfidence = config.min_confidence ?? 0.6;
                    if (aiSignal.confidence >= minConfidence) {
                        this.emit('ai_signal', aiSignal, aiResponse);
                    }
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.emit('ai_fallback', message);
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
        const smaFast = this.calculateSMA(prices, SMA_FAST_PERIOD);
        const smaSlow = this.calculateSMA(prices, SMA_SLOW_PERIOD);
        const momentum = this.calculateMomentum(prices);
        const volatility = this.calculateVolatility(prices);
        const atr = this.calculateATR(prices, ATR_PERIOD);

        // Store for crossover detection
        this.prevEmaFast.set(market, this.emaFastValues.get(market) ?? emaFast);
        this.prevEmaSlow.set(market, this.emaSlowValues.get(market) ?? emaSlow);
        this.emaFastValues.set(market, emaFast);
        this.emaSlowValues.set(market, emaSlow);

        return { rsi, emaFast, emaSlow, smaFast, smaSlow, momentum, volatility, atr };
    }

    private calculateSMA(prices: number[], period: number): number {
        if (prices.length < period) {
            const price = prices[prices.length - 1];
            return price ?? 0;
        }
        const recentPrices = prices.slice(-period);
        return recentPrices.reduce((a, b) => a + b, 0) / period;
    }

    private calculateATR(prices: number[], period: number): number {
        if (prices.length < period + 1) {
            return 0;
        }

        // Calculate True Range for each period
        const trueRanges: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            const high = prices[i] ?? 0;
            const prevClose = prices[i - 1] ?? 0;
            const tr = Math.abs(high - prevClose);
            trueRanges.push(tr);
        }

        const recentTR = trueRanges.slice(-period);
        if (recentTR.length === 0) return 0;

        return recentTR.reduce((a, b) => a + b, 0) / recentTR.length;
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

        // Default expiry to 1 minute
        const now = new Date();
        const expiry = new Date(now.getTime() + 60000);

        return {
            type,
            confidence,
            reason,
            market,
            timestamp: now.toISOString(),
            expiry: expiry.toISOString(),
            metadata: {
                technicals: indicators
            }
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
