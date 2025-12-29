/**
 * TraderMind Risk Rules Package
 * Risk boundary validation per Section 13.3 of PRD
 *
 * Priority Chain:
 * User-level limits > Session limits > Strategy limits > AI suggestions
 */

import type { Signal } from '@tradermind/schemas';

// Local type for risk profile (to avoid circular dependency)
type RiskProfile = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UserRiskLimits {
    maxDrawdown: number; // User's personal max drawdown (FR-019)
    maxDailyLoss: number;
    maxTradesPerSession: number;
}

export interface SessionRiskLimits {
    maxParticipants: number; // FR-013
    minBalance: number; // FR-014
    riskProfile: RiskProfile;
    globalLossThreshold: number; // FR-015
}

export interface StrategyRiskLimits {
    maxStake: number;
    minConfidence: number;
    allowedMarkets: string[];
    allowedRegimes: ('TRENDING' | 'RANGING' | 'VOLATILE')[];
}

/**
 * RiskGuard validation result
 */
export interface RiskValidationResult {
    approved: boolean;
    reason: string | null;
    overriddenBy: 'USER' | 'SESSION' | 'STRATEGY' | 'AI' | null;
}

/**
 * Validate signal against risk hierarchy (Section 13.3)
 * AI can only reject, never force execution
 */
export function validateSignalAgainstRiskHierarchy(
    signal: Signal,
    userLimits: UserRiskLimits,
    _sessionLimits: SessionRiskLimits,
    strategyLimits: StrategyRiskLimits,
    currentDrawdown: number,
    currentDailyLoss: number
): RiskValidationResult {
    // User-level limits override all (FR-019)
    if (currentDrawdown >= userLimits.maxDrawdown) {
        return {
            approved: false,
            reason: 'USER_MAX_DRAWDOWN_REACHED',
            overriddenBy: 'USER',
        };
    }

    if (currentDailyLoss >= userLimits.maxDailyLoss) {
        return {
            approved: false,
            reason: 'USER_DAILY_LOSS_LIMIT',
            overriddenBy: 'USER',
        };
    }

    // Strategy limits
    if (signal.confidence < strategyLimits.minConfidence) {
        return {
            approved: false,
            reason: 'STRATEGY_MIN_CONFIDENCE_NOT_MET',
            overriddenBy: 'STRATEGY',
        };
    }

    if (!strategyLimits.allowedMarkets.includes(signal.market)) {
        return {
            approved: false,
            reason: 'STRATEGY_MARKET_NOT_ALLOWED',
            overriddenBy: 'STRATEGY',
        };
    }

    return {
        approved: true,
        reason: null,
        overriddenBy: null,
    };
}
