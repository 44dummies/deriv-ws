/**
 * TraderMind Trading Strategies
 * Comprehensive strategy library for Jump and Volatility indices
 * 
 * Supported Markets:
 * - Volatility: R_10, R_25, R_50, R_75, R_100
 * - Jump Indices: JD_10, JD_25, JD_50, JD_75, JD_100
 */

// =============================================================================
// TYPES
// =============================================================================

export type SignalType = 'CALL' | 'PUT';
export type MarketType = 'VOLATILITY' | 'JUMP';
export type TimeFrame = '1m' | '5m' | '15m' | '1h';

export interface StrategySignal {
    type: SignalType;
    confidence: number;
    strategy: string;
    reason: string;
    market: string;
    timestamp: string;
    suggested_duration: number; // in minutes
    suggested_stake_multiplier: number; // 1.0 = base stake
    stop_conditions?: string[];
}

export interface MarketAnalysis {
    trend: 'BULLISH' | 'BEARISH' | 'RANGING';
    strength: number; // 0-100
    volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    momentum: number; // -100 to +100
    support: number;
    resistance: number;
}

export interface IndicatorSet {
    rsi: number;
    rsi_prev: number;
    ema_fast: number;
    ema_slow: number;
    ema_cross: 'BULLISH' | 'BEARISH' | 'NONE';
    macd: number;
    macd_signal: number;
    macd_histogram: number;
    bollinger_upper: number;
    bollinger_middle: number;
    bollinger_lower: number;
    bollinger_width: number;
    atr: number;
    adx: number;
    stochastic_k: number;
    stochastic_d: number;
    momentum: number;
    volatility: number;
    volume_trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

// =============================================================================
// SUPPORTED MARKETS
// =============================================================================

// JUMP Indices (JD_*) are deprecated/invalid. Consolidating to Volatility.
export const VOLATILITY_INDICES = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'] as const;
export const JUMP_INDICES = [] as const; // Removed invalid symbols
export const ALL_MARKETS = [...VOLATILITY_INDICES] as const;

export type VolatilityIndex = typeof VOLATILITY_INDICES[number];
export type JumpIndex = never;
export type SupportedMarket = typeof ALL_MARKETS[number];

export function getMarketType(market: string): MarketType {
    // Treat everything as VOLATILITY since Jump is removed
    return 'VOLATILITY';
}

// =============================================================================
// STRATEGY BASE CLASS
// =============================================================================

export abstract class TradingStrategy {
    abstract name: string;
    abstract description: string;
    abstract suitableMarkets: MarketType[];
    abstract minConfidence: number;

    abstract analyze(
        prices: number[],
        indicators: IndicatorSet,
        market: string,
        history?: TradeHistory[]
    ): StrategySignal | null;

    protected createSignal(
        type: SignalType,
        confidence: number,
        reason: string,
        market: string,
        duration: number = 3,
        stakeMultiplier: number = 1.0
    ): StrategySignal {
        return {
            type,
            confidence: Math.min(1, Math.max(0, confidence)),
            strategy: this.name,
            reason,
            market,
            timestamp: new Date().toISOString(),
            suggested_duration: duration,
            suggested_stake_multiplier: stakeMultiplier,
        };
    }
}

// =============================================================================
// TRADE HISTORY (for learning)
// =============================================================================

export interface TradeHistory {
    id: string;
    market: string;
    signal_type: SignalType;
    strategy_used: string;
    entry_price: number;
    exit_price: number;
    pnl: number;
    result: 'WIN' | 'LOSS';
    indicators_at_entry: Partial<IndicatorSet>;
    duration: number;
    timestamp: string;
}

// =============================================================================
// STRATEGY 1: RSI Divergence (Volatility)
// =============================================================================

export class RSIDivergenceStrategy extends TradingStrategy {
    name = 'RSI_DIVERGENCE';
    description = 'Identifies RSI divergence with price for reversal signals';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.65;

    analyze(prices: number[], indicators: IndicatorSet, market: string): StrategySignal | null {
        const { rsi, rsi_prev, momentum } = indicators;

        // Bullish divergence: Price making lower lows, RSI making higher lows
        if (rsi < 35 && rsi > rsi_prev && momentum < -20) {
            const confidence = 0.6 + (35 - rsi) / 100 + (rsi - rsi_prev) / 50;
            return this.createSignal('CALL', confidence, 'Bullish RSI Divergence - Oversold reversal', market, 5);
        }

        // Bearish divergence: Price making higher highs, RSI making lower highs
        if (rsi > 65 && rsi < rsi_prev && momentum > 20) {
            const confidence = 0.6 + (rsi - 65) / 100 + (rsi_prev - rsi) / 50;
            return this.createSignal('PUT', confidence, 'Bearish RSI Divergence - Overbought reversal', market, 5);
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 2: EMA Cross with Momentum (Both)
// =============================================================================

export class EMACrossMomentumStrategy extends TradingStrategy {
    name = 'EMA_CROSS_MOMENTUM';
    description = 'EMA crossover confirmed by momentum';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.60;

    analyze(prices: number[], indicators: IndicatorSet, market: string): StrategySignal | null {
        const { ema_cross, momentum, adx } = indicators;

        // Strong trend confirmation
        if (adx < 20) return null; // No clear trend

        if (ema_cross === 'BULLISH' && momentum > 10) {
            const confidence = 0.55 + (adx / 200) + (momentum / 200);
            return this.createSignal('CALL', confidence, 'Bullish EMA Cross with positive momentum', market, 3);
        }

        if (ema_cross === 'BEARISH' && momentum < -10) {
            const confidence = 0.55 + (adx / 200) + Math.abs(momentum) / 200;
            return this.createSignal('PUT', confidence, 'Bearish EMA Cross with negative momentum', market, 3);
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 3: Bollinger Band Squeeze (Jump Indices)
// =============================================================================

export class BollingerSqueezeStrategy extends TradingStrategy {
    name = 'BOLLINGER_SQUEEZE';
    description = 'Detects Bollinger Band squeeze for volatility breakouts';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.70;

    analyze(prices: number[], indicators: IndicatorSet, market: string): StrategySignal | null {
        const { bollinger_width, bollinger_upper, bollinger_lower, momentum } = indicators;
        const currentPrice = prices[prices.length - 1] || 0;

        // Squeeze detection: Narrow bands
        if (bollinger_width > 0.02) return null; // Not in squeeze

        // Breakout above upper band
        if (currentPrice > bollinger_upper && momentum > 0) {
            const confidence = 0.65 + (momentum / 100);
            return this.createSignal('CALL', confidence, 'Bollinger Band squeeze breakout UP', market, 2, 1.5);
        }

        // Breakout below lower band
        if (currentPrice < bollinger_lower && momentum < 0) {
            const confidence = 0.65 + Math.abs(momentum) / 100;
            return this.createSignal('PUT', confidence, 'Bollinger Band squeeze breakout DOWN', market, 2, 1.5);
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 4: MACD Histogram Reversal (Both)
// =============================================================================

export class MACDHistogramStrategy extends TradingStrategy {
    name = 'MACD_HISTOGRAM';
    description = 'MACD histogram reversal detection';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.55;

    analyze(prices: number[], indicators: IndicatorSet, market: string): StrategySignal | null {
        const { macd_histogram, macd, macd_signal, adx } = indicators;

        // Histogram crossing zero from below
        if (macd_histogram > 0 && macd_histogram < 0.5 && macd > macd_signal) {
            const confidence = 0.5 + (adx / 200) + (macd_histogram * 2);
            return this.createSignal('CALL', confidence, 'MACD Histogram turned positive', market, 5);
        }

        // Histogram crossing zero from above
        if (macd_histogram < 0 && macd_histogram > -0.5 && macd < macd_signal) {
            const confidence = 0.5 + (adx / 200) + Math.abs(macd_histogram * 2);
            return this.createSignal('PUT', confidence, 'MACD Histogram turned negative', market, 5);
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 5: Stochastic Oversold/Overbought (Volatility)
// =============================================================================

export class StochasticStrategy extends TradingStrategy {
    name = 'STOCHASTIC';
    description = 'Stochastic oscillator extreme readings with crossover';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.60;

    analyze(prices: number[], indicators: IndicatorSet, market: string): StrategySignal | null {
        const { stochastic_k, stochastic_d } = indicators;

        // Oversold with bullish crossover
        if (stochastic_k < 25 && stochastic_k > stochastic_d) {
            const confidence = 0.55 + (25 - stochastic_k) / 100;
            return this.createSignal('CALL', confidence, 'Stochastic oversold bullish crossover', market, 3);
        }

        // Overbought with bearish crossover
        if (stochastic_k > 75 && stochastic_k < stochastic_d) {
            const confidence = 0.55 + (stochastic_k - 75) / 100;
            return this.createSignal('PUT', confidence, 'Stochastic overbought bearish crossover', market, 3);
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 6: Volatility Spike (Jump Indices)
// =============================================================================

export class VolatilitySpikeStrategy extends TradingStrategy {
    name = 'VOLATILITY_SPIKE';
    description = 'Detects sudden volatility spikes for quick trades';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.70;

    analyze(prices: number[], indicators: IndicatorSet, market: string): StrategySignal | null {
        const { atr, volatility, momentum } = indicators;

        // High volatility spike
        if (volatility > 25 && atr > 1.5) {
            if (momentum > 30) {
                return this.createSignal('CALL', 0.75, 'Volatility spike with strong upward momentum', market, 1, 0.5);
            }
            if (momentum < -30) {
                return this.createSignal('PUT', 0.75, 'Volatility spike with strong downward momentum', market, 1, 0.5);
            }
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 7: Support/Resistance Bounce (Both)
// =============================================================================

export class SupportResistanceStrategy extends TradingStrategy {
    name = 'SUPPORT_RESISTANCE';
    description = 'Trades bounces off support and resistance levels';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.65;

    analyze(prices: number[], indicators: IndicatorSet, market: string, history?: TradeHistory[]): StrategySignal | null {
        const { bollinger_upper, bollinger_lower, rsi, momentum } = indicators;
        const currentPrice = prices[prices.length - 1] || 0;
        const tolerance = 0.001; // 0.1%

        // Bounce off support (lower Bollinger)
        if (Math.abs(currentPrice - bollinger_lower) / currentPrice < tolerance && rsi < 40) {
            const confidence = 0.6 + (40 - rsi) / 100;
            return this.createSignal('CALL', confidence, 'Price at support level, expecting bounce', market, 5);
        }

        // Bounce off resistance (upper Bollinger)
        if (Math.abs(currentPrice - bollinger_upper) / currentPrice < tolerance && rsi > 60) {
            const confidence = 0.6 + (rsi - 60) / 100;
            return this.createSignal('PUT', confidence, 'Price at resistance level, expecting pullback', market, 5);
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 8: ADX Trend Following (Both)
// =============================================================================

export class ADXTrendStrategy extends TradingStrategy {
    name = 'ADX_TREND';
    description = 'Strong trend following using ADX';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.70;

    analyze(prices: number[], indicators: IndicatorSet, market: string): StrategySignal | null {
        const { adx, momentum, ema_cross } = indicators;

        // Strong trend only
        if (adx < 30) return null;

        // Trend following
        if (adx > 40 && momentum > 20 && ema_cross === 'BULLISH') {
            const confidence = 0.65 + (adx - 40) / 200 + (momentum / 200);
            return this.createSignal('CALL', confidence, 'Strong bullish trend detected by ADX', market, 5, 1.25);
        }

        if (adx > 40 && momentum < -20 && ema_cross === 'BEARISH') {
            const confidence = 0.65 + (adx - 40) / 200 + Math.abs(momentum) / 200;
            return this.createSignal('PUT', confidence, 'Strong bearish trend detected by ADX', market, 5, 1.25);
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 9: Multi-Timeframe Confirmation (Volatility)
// =============================================================================

export class MultiTimeframeStrategy extends TradingStrategy {
    name = 'MULTI_TIMEFRAME';
    description = 'Confirms signals across multiple timeframes';
    suitableMarkets: MarketType[] = ['VOLATILITY'];
    minConfidence = 0.75;

    analyze(prices: number[], indicators: IndicatorSet, market: string): StrategySignal | null {
        const { rsi, ema_cross, macd_histogram, stochastic_k, adx } = indicators;

        // All indicators align bullish
        const bullishScore =
            (rsi < 50 ? 1 : 0) +
            (ema_cross === 'BULLISH' ? 1 : 0) +
            (macd_histogram > 0 ? 1 : 0) +
            (stochastic_k < 50 ? 1 : 0) +
            (adx > 25 ? 1 : 0);

        // All indicators align bearish
        const bearishScore =
            (rsi > 50 ? 1 : 0) +
            (ema_cross === 'BEARISH' ? 1 : 0) +
            (macd_histogram < 0 ? 1 : 0) +
            (stochastic_k > 50 ? 1 : 0) +
            (adx > 25 ? 1 : 0);

        if (bullishScore >= 4) {
            const confidence = 0.7 + (bullishScore - 4) * 0.05;
            return this.createSignal('CALL', confidence, 'Multi-indicator bullish confluence', market, 5, 1.5);
        }

        if (bearishScore >= 4) {
            const confidence = 0.7 + (bearishScore - 4) * 0.05;
            return this.createSignal('PUT', confidence, 'Multi-indicator bearish confluence', market, 5, 1.5);
        }

        return null;
    }
}

// =============================================================================
// STRATEGY 10: News/Event Adaptive (Both) - Learns from DB
// =============================================================================

export class AdaptiveStrategy extends TradingStrategy {
    name = 'ADAPTIVE';
    description = 'Adapts based on historical trade performance from database';
    suitableMarkets: MarketType[] = ['VOLATILITY', 'JUMP'];
    minConfidence = 0.60;

    analyze(prices: number[], indicators: IndicatorSet, market: string, history?: TradeHistory[]): StrategySignal | null {
        if (!history || history.length < 10) return null;

        // Analyze past performance for this market
        const marketHistory = history.filter(h => h.market === market);
        if (marketHistory.length < 5) return null;

        // Calculate win rate for similar conditions
        const recentWins = marketHistory.filter(h => h.result === 'WIN').length;
        const winRate = recentWins / marketHistory.length;

        // Only trade if we have > 60% win rate historically
        if (winRate < 0.6) return null;

        const { rsi, momentum, adx } = indicators;

        // Find similar past conditions
        const similarTrades = marketHistory.filter(h => {
            if (!h.indicators_at_entry.rsi) return false;
            return Math.abs((h.indicators_at_entry.rsi || 0) - rsi) < 10;
        });

        if (similarTrades.length < 3) return null;

        const similarWinRate = similarTrades.filter(h => h.result === 'WIN').length / similarTrades.length;

        if (similarWinRate > 0.7) {
            // Use the direction that won most often
            const callWins = similarTrades.filter(h => h.signal_type === 'CALL' && h.result === 'WIN').length;
            const putWins = similarTrades.filter(h => h.signal_type === 'PUT' && h.result === 'WIN').length;

            if (callWins > putWins && momentum > 0) {
                return this.createSignal('CALL', 0.65 + similarWinRate * 0.1,
                    `Adaptive strategy - ${Math.round(similarWinRate * 100)}% win rate in similar conditions`, market, 3);
            } else if (putWins > callWins && momentum < 0) {
                return this.createSignal('PUT', 0.65 + similarWinRate * 0.1,
                    `Adaptive strategy - ${Math.round(similarWinRate * 100)}% win rate in similar conditions`, market, 3);
            }
        }

        return null;
    }
}

// =============================================================================
// STRATEGY MANAGER
// =============================================================================

export class StrategyManager {
    private strategies: TradingStrategy[] = [];

    constructor() {
        // Register all strategies
        this.strategies = [
            new RSIDivergenceStrategy(),
            new EMACrossMomentumStrategy(),
            new BollingerSqueezeStrategy(),
            new MACDHistogramStrategy(),
            new StochasticStrategy(),
            new VolatilitySpikeStrategy(),
            new SupportResistanceStrategy(),
            new ADXTrendStrategy(),
            new MultiTimeframeStrategy(),
            new AdaptiveStrategy(),
        ];

        console.log(`[StrategyManager] Loaded ${this.strategies.length} trading strategies`);
    }

    /**
     * Run all suitable strategies and return best signal
     */
    runAll(
        prices: number[],
        indicators: IndicatorSet,
        market: string,
        history?: TradeHistory[]
    ): StrategySignal | null {
        const marketType = getMarketType(market);
        const signals: StrategySignal[] = [];

        for (const strategy of this.strategies) {
            // Skip strategies not suitable for this market type
            if (!strategy.suitableMarkets.includes(marketType)) continue;

            const signal = strategy.analyze(prices, indicators, market, history);
            if (signal && signal.confidence >= strategy.minConfidence) {
                signals.push(signal);
            }
        }

        // Return highest confidence signal
        if (signals.length === 0) return null;

        signals.sort((a, b) => b.confidence - a.confidence);
        return signals[0] || null;
    }

    /**
     * Get all generated signals (for analysis)
     */
    runAllAndReturnMultiple(
        prices: number[],
        indicators: IndicatorSet,
        market: string,
        history?: TradeHistory[]
    ): StrategySignal[] {
        const marketType = getMarketType(market);
        const signals: StrategySignal[] = [];

        for (const strategy of this.strategies) {
            if (!strategy.suitableMarkets.includes(marketType)) continue;

            const signal = strategy.analyze(prices, indicators, market, history);
            if (signal && signal.confidence >= strategy.minConfidence) {
                signals.push(signal);
            }
        }

        return signals.sort((a, b) => b.confidence - a.confidence);
    }

    getStrategies(): TradingStrategy[] {
        return this.strategies;
    }
}

export const strategyManager = new StrategyManager();
