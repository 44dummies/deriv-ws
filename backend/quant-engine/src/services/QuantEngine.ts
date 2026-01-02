/**
 * TraderMind QuantEngine v2.0
 * Pure quantitative signal generation - NO AI
 * 
 * Features:
 * - 10 comprehensive trading strategies
 * - Database learning from past trades
 * - Jump and Volatility indices focused
 * - Adaptive trading based on historical performance
 */

import { EventEmitter } from 'eventemitter3';
import { NormalizedTick } from './MarketDataService.js';
import { FeatureBuilder } from './FeatureBuilder.js';
import { 
    StrategyManager, 
    StrategySignal, 
    IndicatorSet,
    TradeHistory,
    ALL_MARKETS,
    VOLATILITY_INDICES,
    JUMP_INDICES,
    SupportedMarket,
    getMarketType
} from './Strategies.js';

// =============================================================================
// TYPES
// =============================================================================

export type SignalType = 'CALL' | 'PUT';

export type SignalReason =
    | 'RSI_DIVERGENCE'
    | 'EMA_CROSS_MOMENTUM'
    | 'BOLLINGER_SQUEEZE'
    | 'MACD_HISTOGRAM'
    | 'STOCHASTIC'
    | 'VOLATILITY_SPIKE'
    | 'SUPPORT_RESISTANCE'
    | 'ADX_TREND'
    | 'MULTI_TIMEFRAME'
    | 'ADAPTIVE'
    | 'NO_SIGNAL';

export interface Signal {
    type: SignalType;
    confidence: number;
    reason: SignalReason | string;
    market: string;
    timestamp: string;
    strategy?: string;
    suggested_duration?: number;
    suggested_stake_multiplier?: number;
    metadata?: {
        indicators?: Partial<IndicatorSet>;
        all_signals?: number;
        strategy_details?: string;
        win_rate?: number;
        [key: string]: any;
    };
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
    learning: (market: string, stats: any) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const RSI_PERIOD = 14;
const EMA_FAST_PERIOD = 9;
const EMA_SLOW_PERIOD = 21;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;
const BOLLINGER_PERIOD = 20;
const ATR_PERIOD = 14;
const STOCH_PERIOD = 14;
const ADX_PERIOD = 14;

// =============================================================================
// DATABASE LEARNING ADAPTER
// =============================================================================

interface DatabaseAdapter {
    getTradeHistory(market: string, limit?: number): Promise<TradeHistory[]>;
    getMarketStats(market: string): Promise<{ win_rate: number; total_trades: number; avg_pnl: number }>;
    logTrade(trade: Partial<TradeHistory>): Promise<void>;
}

// In-memory fallback for trade history (populated from DB)
const tradeHistoryCache: Map<string, TradeHistory[]> = new Map();

// =============================================================================
// QUANT ENGINE
// =============================================================================

export class QuantEngine extends EventEmitter<QuantEngineEvents> {
    private priceHistory: Map<string, number[]> = new Map();
    private emaFastValues: Map<string, number> = new Map();
    private emaSlowValues: Map<string, number> = new Map();
    private prevEmaFast: Map<string, number> = new Map();
    private prevEmaSlow: Map<string, number> = new Map();
    private prevRsi: Map<string, number> = new Map();
    private macdValues: Map<string, { macd: number; signal: number; histogram: number }> = new Map();
    private bollingerValues: Map<string, { upper: number; middle: number; lower: number; width: number }> = new Map();
    private atrValues: Map<string, number> = new Map();
    private adxValues: Map<string, number> = new Map();
    private stochValues: Map<string, { k: number; d: number }> = new Map();

    private featureBuilder: FeatureBuilder;
    private strategyManager: StrategyManager;
    private dbAdapter: DatabaseAdapter | undefined;

    // Learning stats
    private marketWinRates: Map<string, number> = new Map();
    private strategyWinRates: Map<string, Map<string, number>> = new Map();

    constructor(dbAdapter?: DatabaseAdapter) {
        super();
        this.featureBuilder = new FeatureBuilder();
        this.strategyManager = new StrategyManager();
        this.dbAdapter = dbAdapter;
        
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('[QuantEngine v2.0] Pure Quantitative Trading Engine Initialized');
        console.log('[QuantEngine] Strategies Loaded:', this.strategyManager.getStrategies().map(s => s.name).join(', '));
        console.log('[QuantEngine] Supported Markets:', ALL_MARKETS.join(', '));
        console.log('[QuantEngine] Database Learning:', dbAdapter ? 'ENABLED' : 'DISABLED');
        console.log('═══════════════════════════════════════════════════════════════');
    }

    // ---------------------------------------------------------------------------
    // DATABASE LEARNING
    // ---------------------------------------------------------------------------

    /**
     * Load trade history from database for learning
     */
    async loadTradeHistory(markets: string[] = [...ALL_MARKETS]): Promise<void> {
        if (!this.dbAdapter) {
            console.log('[QuantEngine] No database adapter, skipping history load');
            return;
        }

        for (const market of markets) {
            try {
                const history = await this.dbAdapter.getTradeHistory(market, 100);
                tradeHistoryCache.set(market, history);
                
                // Calculate win rate
                if (history.length > 0) {
                    const wins = history.filter(h => h.result === 'WIN').length;
                    this.marketWinRates.set(market, wins / history.length);
                }

                console.log(`[QuantEngine] Loaded ${history.length} trades for ${market}`);
            } catch (error) {
                console.error(`[QuantEngine] Failed to load history for ${market}:`, error);
            }
        }
    }

    /**
     * Get trade history for a market
     */
    getTradeHistory(market: string): TradeHistory[] {
        return tradeHistoryCache.get(market) || [];
    }

    /**
     * Record a trade result for learning
     */
    async recordTradeResult(trade: Partial<TradeHistory>): Promise<void> {
        const market = trade.market || '';
        
        // Update in-memory cache
        const history = tradeHistoryCache.get(market) || [];
        history.push(trade as TradeHistory);
        if (history.length > 100) history.shift();
        tradeHistoryCache.set(market, history);

        // Update win rate
        const wins = history.filter(h => h.result === 'WIN').length;
        this.marketWinRates.set(market, wins / history.length);

        // Log to DB if available
        if (this.dbAdapter) {
            try {
                await this.dbAdapter.logTrade(trade);
            } catch (error) {
                console.error('[QuantEngine] Failed to log trade:', error);
            }
        }

        this.emit('learning', market, {
            win_rate: this.marketWinRates.get(market),
            total_trades: history.length
        });
    }

    // ---------------------------------------------------------------------------
    // MARKET VALIDATION
    // ---------------------------------------------------------------------------

    /**
     * Check if market is supported
     */
    isMarketSupported(market: string): boolean {
        return ALL_MARKETS.includes(market as SupportedMarket);
    }

    /**
     * Get market type
     */
    getMarketType(market: string) {
        return getMarketType(market);
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

        // Validate market
        if (!this.isMarketSupported(market)) {
            console.warn(`[QuantEngine] Market ${market} not supported. Only Jump and Volatility indices allowed.`);
            return null;
        }

        // Check if market is allowed by config
        if (config?.allowed_markets && !config.allowed_markets.includes(market)) {
            return null;
        }

        // Update price history
        this.updatePriceHistory(market, ticks);

        // Calculate all indicators
        const indicators = this.calculateAllIndicators(market);
        const simpleIndicators = this.getSimpleIndicators(market);
        this.emit('indicators', market, simpleIndicators);

        // Get trade history for learning
        const history = this.getTradeHistory(market);

        // Run all strategies
        const prices = this.priceHistory.get(market) ?? [];
        const strategySignal = this.strategyManager.runAll(prices, indicators, market, history);

        if (!strategySignal) {
            return null;
        }

        // Apply minimum confidence from config
        const minConfidence = config?.min_confidence ?? 0.55;
        if (strategySignal.confidence < minConfidence) {
            return null;
        }

        // Adjust confidence based on historical win rate
        const marketWinRate = this.marketWinRates.get(market);
        if (marketWinRate !== undefined && marketWinRate < 0.5) {
            // Reduce confidence for poorly performing markets
            strategySignal.confidence *= 0.85;
        }

        // Convert to our Signal format
        const signal: Signal = {
            type: strategySignal.type,
            confidence: strategySignal.confidence,
            reason: strategySignal.strategy as SignalReason,
            market,
            timestamp: strategySignal.timestamp,
            strategy: strategySignal.strategy,
            suggested_duration: strategySignal.suggested_duration,
            suggested_stake_multiplier: strategySignal.suggested_stake_multiplier,
            metadata: {
                indicators: this.getIndicatorSnapshot(indicators),
                strategy_details: strategySignal.reason,
                win_rate: marketWinRate ?? 0,
            }
        };

        this.emit('signal', signal);
        return signal;
    }

    /**
     * Process single tick (for real-time use)
     */
    async processTick(tick: NormalizedTick, config?: SessionConfig): Promise<Signal | null> {
        const market = tick.market;

        // Validate market
        if (!this.isMarketSupported(market)) {
            return null;
        }

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
        const indicators = this.calculateAllIndicators(market);
        const simpleIndicators = this.getSimpleIndicators(market);
        this.emit('indicators', market, simpleIndicators);

        // Get trade history for learning
        const tradeHistory = this.getTradeHistory(market);

        // Run all strategies
        const prices = this.priceHistory.get(market) ?? [];
        const strategySignal = this.strategyManager.runAll(prices, indicators, market, tradeHistory);

        if (!strategySignal) {
            return null;
        }

        // Apply minimum confidence
        const minConfidence = config?.min_confidence ?? 0.55;
        if (strategySignal.confidence < minConfidence) {
            return null;
        }

        // Adjust for historical performance
        const marketWinRate = this.marketWinRates.get(market);
        if (marketWinRate !== undefined && marketWinRate < 0.5) {
            strategySignal.confidence *= 0.85;
        }

        const signal: Signal = {
            type: strategySignal.type,
            confidence: strategySignal.confidence,
            reason: strategySignal.strategy as SignalReason,
            market,
            timestamp: strategySignal.timestamp,
            strategy: strategySignal.strategy,
            suggested_duration: strategySignal.suggested_duration,
            suggested_stake_multiplier: strategySignal.suggested_stake_multiplier,
            metadata: {
                indicators: this.getIndicatorSnapshot(indicators),
                strategy_details: strategySignal.reason,
                win_rate: marketWinRate ?? 0,
            }
        };

        this.emit('signal', signal);
        return signal;
    }

    // ---------------------------------------------------------------------------
    // INDICATOR CALCULATIONS - COMPREHENSIVE
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

    private calculateAllIndicators(market: string): IndicatorSet {
        const prices = this.priceHistory.get(market) ?? [];

        // Basic indicators
        const rsi = this.calculateRSI(prices);
        const rsi_prev = this.prevRsi.get(market) ?? rsi;
        this.prevRsi.set(market, rsi);

        const ema_fast = this.calculateEMA(prices, EMA_FAST_PERIOD);
        const ema_slow = this.calculateEMA(prices, EMA_SLOW_PERIOD);

        const prevFast = this.prevEmaFast.get(market) ?? ema_fast;
        const prevSlow = this.prevEmaSlow.get(market) ?? ema_slow;

        let ema_cross: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
        if (prevFast <= prevSlow && ema_fast > ema_slow) ema_cross = 'BULLISH';
        else if (prevFast >= prevSlow && ema_fast < ema_slow) ema_cross = 'BEARISH';

        this.prevEmaFast.set(market, ema_fast);
        this.prevEmaSlow.set(market, ema_slow);
        this.emaFastValues.set(market, ema_fast);
        this.emaSlowValues.set(market, ema_slow);

        // MACD
        const ema12 = this.calculateEMA(prices, MACD_FAST);
        const ema26 = this.calculateEMA(prices, MACD_SLOW);
        const macd = ema12 - ema26;
        const macd_signal = this.calculateEMAFromValue(macd, MACD_SIGNAL, this.macdValues.get(market)?.signal ?? macd);
        const macd_histogram = macd - macd_signal;
        this.macdValues.set(market, { macd, signal: macd_signal, histogram: macd_histogram });

        // Bollinger Bands
        const bollinger = this.calculateBollingerBands(prices);
        this.bollingerValues.set(market, bollinger);

        // ATR
        const atr = this.calculateATR(prices);
        this.atrValues.set(market, atr);

        // ADX
        const adx = this.calculateADX(prices);
        this.adxValues.set(market, adx);

        // Stochastic
        const stoch = this.calculateStochastic(prices);
        this.stochValues.set(market, stoch);

        // Momentum and volatility
        const momentum = this.calculateMomentum(prices);
        const volatility = this.calculateVolatility(prices);

        // Volume trend (approximated from price movements)
        const volume_trend = this.approximateVolumeTrend(prices);

        return {
            rsi,
            rsi_prev,
            ema_fast,
            ema_slow,
            ema_cross,
            macd,
            macd_signal,
            macd_histogram,
            bollinger_upper: bollinger.upper,
            bollinger_middle: bollinger.middle,
            bollinger_lower: bollinger.lower,
            bollinger_width: bollinger.width,
            atr,
            adx,
            stochastic_k: stoch.k,
            stochastic_d: stoch.d,
            momentum: momentum * 100, // Convert to percentage
            volatility: volatility * 100, // Convert to percentage
            volume_trend,
        };
    }

    private getSimpleIndicators(market: string): IndicatorValues {
        const prices = this.priceHistory.get(market) ?? [];
        return {
            rsi: this.calculateRSI(prices),
            emaFast: this.emaFastValues.get(market) ?? 0,
            emaSlow: this.emaSlowValues.get(market) ?? 0,
            momentum: this.calculateMomentum(prices),
            volatility: this.calculateVolatility(prices),
        };
    }

    private getIndicatorSnapshot(indicators: IndicatorSet): Partial<IndicatorSet> {
        return {
            rsi: indicators.rsi,
            ema_cross: indicators.ema_cross,
            macd_histogram: indicators.macd_histogram,
            adx: indicators.adx,
            momentum: indicators.momentum,
        };
    }

    private calculateRSI(prices: number[]): number {
        if (prices.length < RSI_PERIOD + 1) {
            return 50;
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
            return prices[prices.length - 1] ?? 0;
        }

        const multiplier = 2 / (period + 1);
        let ema = 0;

        for (let i = 0; i < period; i++) {
            ema += prices[i] ?? 0;
        }
        ema /= period;

        for (let i = period; i < prices.length; i++) {
            const price = prices[i] ?? 0;
            ema = (price - ema) * multiplier + ema;
        }

        return ema;
    }

    private calculateEMAFromValue(value: number, period: number, prevEma: number): number {
        const multiplier = 2 / (period + 1);
        return (value - prevEma) * multiplier + prevEma;
    }

    private calculateBollingerBands(prices: number[]): { upper: number; middle: number; lower: number; width: number } {
        if (prices.length < BOLLINGER_PERIOD) {
            const price = prices[prices.length - 1] ?? 0;
            return { upper: price, middle: price, lower: price, width: 0 };
        }

        const recentPrices = prices.slice(-BOLLINGER_PERIOD);
        const middle = recentPrices.reduce((a, b) => a + b, 0) / BOLLINGER_PERIOD;
        
        const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / BOLLINGER_PERIOD;
        const stdDev = Math.sqrt(variance);

        const upper = middle + 2 * stdDev;
        const lower = middle - 2 * stdDev;
        const width = (upper - lower) / middle;

        return { upper, middle, lower, width };
    }

    private calculateATR(prices: number[]): number {
        if (prices.length < ATR_PERIOD + 1) {
            return 0;
        }

        const trueRanges: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            const high = prices[i] ?? 0;
            const low = prices[i] ?? 0;
            const prevClose = prices[i - 1] ?? 0;
            
            // True Range = max(high - low, |high - prev close|, |low - prev close|)
            // Without OHLC, we approximate
            const range = Math.abs(high - prevClose);
            trueRanges.push(range);
        }

        const recentTR = trueRanges.slice(-ATR_PERIOD);
        return recentTR.reduce((a, b) => a + b, 0) / ATR_PERIOD;
    }

    private calculateADX(prices: number[]): number {
        if (prices.length < ADX_PERIOD + 2) {
            return 0;
        }

        // Simplified ADX calculation
        let upMoves = 0;
        let downMoves = 0;
        let totalMoves = 0;

        for (let i = 1; i < prices.length; i++) {
            const move = (prices[i] ?? 0) - (prices[i - 1] ?? 0);
            totalMoves += Math.abs(move);
            if (move > 0) upMoves += move;
            else downMoves += Math.abs(move);
        }

        if (totalMoves === 0) return 0;

        // DI+ and DI-
        const diPlus = (upMoves / totalMoves) * 100;
        const diMinus = (downMoves / totalMoves) * 100;

        // ADX = (DI+ - DI-) / (DI+ + DI-)
        const sum = diPlus + diMinus;
        if (sum === 0) return 0;

        return Math.abs(diPlus - diMinus) / sum * 100;
    }

    private calculateStochastic(prices: number[]): { k: number; d: number } {
        if (prices.length < STOCH_PERIOD) {
            return { k: 50, d: 50 };
        }

        const recentPrices = prices.slice(-STOCH_PERIOD);
        const high = Math.max(...recentPrices);
        const low = Math.min(...recentPrices);
        const close = recentPrices[recentPrices.length - 1] ?? 0;

        if (high === low) {
            return { k: 50, d: 50 };
        }

        const k = ((close - low) / (high - low)) * 100;
        
        // D is 3-period SMA of K (simplified)
        const prevStoch = this.stochValues.get('temp') ?? { k: 50, d: 50 };
        const d = (k + prevStoch.k + prevStoch.d) / 3;

        return { k, d };
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

        return Math.sqrt(variance) / mean;
    }

    private approximateVolumeTrend(prices: number[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
        if (prices.length < 20) return 'STABLE';

        // Approximate volume from price movement intensity
        const recent10: number[] = [];
        const prev10: number[] = [];

        for (let i = prices.length - 10; i < prices.length; i++) {
            if (i > 0) {
                recent10.push(Math.abs((prices[i] ?? 0) - (prices[i - 1] ?? 0)));
            }
        }

        for (let i = prices.length - 20; i < prices.length - 10; i++) {
            if (i > 0) {
                prev10.push(Math.abs((prices[i] ?? 0) - (prices[i - 1] ?? 0)));
            }
        }

        const recentAvg = recent10.reduce((a, b) => a + b, 0) / recent10.length;
        const prevAvg = prev10.reduce((a, b) => a + b, 0) / prev10.length;

        if (recentAvg > prevAvg * 1.1) return 'INCREASING';
        if (recentAvg < prevAvg * 0.9) return 'DECREASING';
        return 'STABLE';
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
        this.prevRsi.delete(market);
        this.macdValues.delete(market);
        this.bollingerValues.delete(market);
        this.atrValues.delete(market);
        this.adxValues.delete(market);
        this.stochValues.delete(market);
    }

    /**
     * Get supported markets
     */
    getSupportedMarkets(): string[] {
        return [...ALL_MARKETS];
    }

    /**
     * Get volatility indices
     */
    getVolatilityIndices(): string[] {
        return [...VOLATILITY_INDICES];
    }

    /**
     * Get jump indices
     */
    getJumpIndices(): string[] {
        return [...JUMP_INDICES];
    }

    /**
     * Get stats
     */
    getStats(): { 
        markets: string[]; 
        historySize: Record<string, number>;
        winRates: Record<string, number>;
        strategies: string[];
    } {
        const historySize: Record<string, number> = {};
        const winRates: Record<string, number> = {};

        for (const [market, prices] of this.priceHistory) {
            historySize[market] = prices.length;
        }

        for (const [market, rate] of this.marketWinRates) {
            winRates[market] = rate;
        }

        return {
            markets: Array.from(this.priceHistory.keys()),
            historySize,
            winRates,
            strategies: this.strategyManager.getStrategies().map(s => s.name),
        };
    }
}

// Export singleton instance
export const quantEngine = new QuantEngine();
