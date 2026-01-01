/**
 * TraderMind Shared Trading Core
 * Consolidated services used by both API Gateway and Quant Engine
 * This eliminates code duplication between services
 */

// EventEmitter removed - not needed in core utilities

// =============================================================================
// TYPES
// =============================================================================

export type SignalType = 'CALL' | 'PUT';
export type RiskProfile = 'LOW' | 'MEDIUM' | 'HIGH';
export type SessionStatus = 'PENDING' | 'ACTIVE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
export type ParticipantStatus = 'PENDING' | 'ACTIVE' | 'FAILED' | 'REMOVED' | 'OPTED_OUT';

export interface Signal {
    type: SignalType;
    confidence: number;
    reason: string;
    market: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export interface NormalizedTick {
    market: string;
    bid: number;
    ask: number;
    quote: number;
    timestamp: string;
    epoch: number;
}

export interface SessionConfig {
    max_participants?: number;
    min_balance?: number;
    risk_profile?: RiskProfile;
    allowed_markets?: string[];
    min_confidence?: number;
    global_loss_threshold?: number;
}

export interface UserRiskLimits {
    maxDrawdown: number;
    maxDailyLoss: number;
    maxTradesPerSession: number;
    currentDrawdown: number;
    currentDailyLoss: number;
    tradesToday: number;
}

export interface RiskValidationResult {
    approved: boolean;
    reason: string | null;
    overriddenBy: 'USER' | 'SESSION' | 'STRATEGY' | null;
}

// =============================================================================
// INDICATOR CALCULATIONS (Shared)
// =============================================================================

export class TechnicalIndicators {
    /**
     * Calculate RSI (Relative Strength Index)
     */
    static calculateRSI(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) return 50; // Default neutral

        let gains = 0;
        let losses = 0;

        // Calculate initial average gain/loss
        for (let i = 1; i <= period; i++) {
            const change = prices[i]! - prices[i - 1]!;
            if (change > 0) gains += change;
            else losses -= change;
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        // Calculate subsequent values using smoothed averages
        for (let i = period + 1; i < prices.length; i++) {
            const change = prices[i]! - prices[i - 1]!;
            if (change > 0) {
                avgGain = (avgGain * (period - 1) + change) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - change) / period;
            }
        }

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate EMA (Exponential Moving Average)
     */
    static calculateEMA(prices: number[], period: number): number {
        if (prices.length === 0) return 0;
        if (prices.length < period) return prices[prices.length - 1]!;

        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

        for (let i = period; i < prices.length; i++) {
            ema = (prices[i]! - ema) * multiplier + ema;
        }

        return ema;
    }

    /**
     * Calculate ATR (Average True Range)
     */
    static calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
        if (highs.length < period + 1) return 0;

        const trueRanges: number[] = [];

        for (let i = 1; i < highs.length; i++) {
            const high = highs[i]!;
            const low = lows[i]!;
            const prevClose = closes[i - 1]!;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }

        // Simple average for first ATR
        let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

        // Smoothed average for subsequent
        for (let i = period; i < trueRanges.length; i++) {
            atr = (atr * (period - 1) + trueRanges[i]!) / period;
        }

        return atr;
    }

    /**
     * Calculate momentum
     */
    static calculateMomentum(prices: number[], period: number = 10): number {
        if (prices.length < period + 1) return 0;
        const current = prices[prices.length - 1]!;
        const previous = prices[prices.length - 1 - period]!;
        return (current - previous) / previous;
    }

    /**
     * Calculate volatility (standard deviation of returns)
     */
    static calculateVolatility(prices: number[], period: number = 20): number {
        if (prices.length < period + 1) return 0;

        const returns: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i]! - prices[i - 1]!) / prices[i - 1]!);
        }

        const recentReturns = returns.slice(-period);
        const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
        const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length;

        return Math.sqrt(variance);
    }

    /**
     * Build complete feature set from prices
     */
    static buildFeatures(prices: number[]): {
        rsi: number;
        ema_fast: number;
        ema_slow: number;
        atr: number;
        momentum: number;
        volatility: number;
    } {
        return {
            rsi: this.calculateRSI(prices),
            ema_fast: this.calculateEMA(prices, 9),
            ema_slow: this.calculateEMA(prices, 21),
            atr: this.calculateVolatility(prices) * 100, // Proxy for ATR when only prices available
            momentum: this.calculateMomentum(prices),
            volatility: this.calculateVolatility(prices)
        };
    }
}

// =============================================================================
// RISK VALIDATION (Shared)
// =============================================================================

export class RiskValidator {
    private static readonly RISK_PROFILES = {
        LOW: { maxStakeMultiplier: 0.5, minConfidence: 0.8 },
        MEDIUM: { maxStakeMultiplier: 1.0, minConfidence: 0.65 },
        HIGH: { maxStakeMultiplier: 1.5, minConfidence: 0.5 }
    };

    /**
     * Validate signal against risk hierarchy
     * Priority: User limits > Session limits > Strategy limits
     */
    static validate(
        signal: Signal,
        userLimits: UserRiskLimits,
        sessionConfig: SessionConfig
    ): RiskValidationResult {
        // Priority 1: User-level limits
        if (userLimits.currentDrawdown >= userLimits.maxDrawdown) {
            return {
                approved: false,
                reason: 'USER_MAX_DRAWDOWN_REACHED',
                overriddenBy: 'USER'
            };
        }

        if (userLimits.currentDailyLoss >= userLimits.maxDailyLoss) {
            return {
                approved: false,
                reason: 'USER_DAILY_LOSS_LIMIT',
                overriddenBy: 'USER'
            };
        }

        if (userLimits.tradesToday >= userLimits.maxTradesPerSession) {
            return {
                approved: false,
                reason: 'USER_MAX_TRADES_REACHED',
                overriddenBy: 'USER'
            };
        }

        // Priority 2: Session limits
        const riskProfile = sessionConfig.risk_profile ?? 'MEDIUM';
        const profileSettings = this.RISK_PROFILES[riskProfile];

        if (signal.confidence < (sessionConfig.min_confidence ?? profileSettings.minConfidence)) {
            return {
                approved: false,
                reason: 'MIN_CONFIDENCE_NOT_MET',
                overriddenBy: 'SESSION'
            };
        }

        // Priority 3: Market validation
        if (sessionConfig.allowed_markets && !sessionConfig.allowed_markets.includes(signal.market)) {
            return {
                approved: false,
                reason: 'MARKET_NOT_ALLOWED',
                overriddenBy: 'STRATEGY'
            };
        }

        return {
            approved: true,
            reason: null,
            overriddenBy: null
        };
    }

    /**
     * Calculate recommended stake based on confidence and risk profile
     */
    static calculateStake(
        baseStake: number,
        confidence: number,
        riskProfile: RiskProfile = 'MEDIUM'
    ): number {
        const profileSettings = this.RISK_PROFILES[riskProfile];
        const multiplier = profileSettings.maxStakeMultiplier * Math.max(0.5, confidence);
        return Math.round(baseStake * multiplier * 100) / 100;
    }
}

// =============================================================================
// MARKET REGIME DETECTION (Shared)
// =============================================================================

export type MarketRegime = 'TRENDING' | 'RANGING' | 'VOLATILE';

export class RegimeDetector {
    /**
     * Detect market regime from technical indicators
     */
    static detect(volatility: number, momentum: number, rsi: number): MarketRegime {
        // High volatility = VOLATILE
        if (volatility > 0.05) {
            return 'VOLATILE';
        }

        // Strong momentum = TRENDING
        if (Math.abs(momentum) > 0.1) {
            return 'TRENDING';
        }

        // RSI at extremes might indicate trend exhaustion
        if (rsi < 20 || rsi > 80) {
            return 'VOLATILE';
        }

        // Default to ranging
        return 'RANGING';
    }

    /**
     * Get regime-specific confidence adjustment
     */
    static getConfidenceAdjustment(regime: MarketRegime): number {
        switch (regime) {
            case 'TRENDING':
                return 1.0; // Full confidence in trends
            case 'RANGING':
                return 0.9; // Slightly reduced
            case 'VOLATILE':
                return 0.7; // Significantly reduced in volatile markets
            default:
                return 0.85;
        }
    }
}

// =============================================================================
// IDEMPOTENCY HELPERS (Shared)
// =============================================================================

import { createHash, randomBytes } from 'crypto';

export class IdempotencyHelper {
    /**
     * Generate idempotency key for trade execution
     */
    static generateKey(sessionId: string, userId: string, timestamp: number): string {
        const payload = `${sessionId}:${userId}:${timestamp}`;
        return createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Generate tick deduplication hash
     */
    static generateTickHash(market: string, timestamp: number, quote: number): string {
        return createHash('md5').update(`${market}:${timestamp}:${quote}`).digest('hex');
    }

    /**
     * Generate secure session ID
     */
    static generateSessionId(): string {
        return randomBytes(16).toString('hex');
    }
}

// All classes are already exported via 'export class' declarations
// Additional alias for backwards compatibility
export { TechnicalIndicators as Indicators };
