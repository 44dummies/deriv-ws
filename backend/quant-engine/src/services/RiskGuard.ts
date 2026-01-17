/**
 * TraderMind RiskGuard
 * Trade approval system based on session rules and user limits
 * 
 * Risk Hierarchy (Section 13.3):
 * User-level limits > Session limits > Strategy limits > AI suggestions
 */

import { EventEmitter } from 'eventemitter3';
import { Signal } from './QuantEngine.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export type RiskProfile = 'LOW' | 'MEDIUM' | 'HIGH';

export type RejectionReason =
    | 'USER_MAX_DRAWDOWN_REACHED'
    | 'USER_DAILY_LOSS_LIMIT'
    | 'USER_MAX_TRADES_REACHED'
    | 'SESSION_LOSS_THRESHOLD'
    | 'SESSION_PAUSED'
    | 'SESSION_MAX_STAKE_EXCEEDED'
    | 'MARKET_NOT_ALLOWED'
    | 'MIN_CONFIDENCE_NOT_MET'
    | 'RISK_PROFILE_VIOLATION'
    | 'USER_OPTED_OUT';

export interface SessionRiskConfig {
    risk_profile: RiskProfile;
    max_stake: number;
    min_confidence: number;
    allowed_markets: string[];
    global_loss_threshold: number;
    current_pnl: number;
    is_paused: boolean;
}

export interface UserRiskConfig {
    max_drawdown: number;
    max_daily_loss: number;
    max_trades_per_session: number;
    current_drawdown: number;
    current_daily_loss: number;
    trades_today: number;
    is_opted_out: boolean;
}

export interface ApprovalResult {
    approved: boolean;
    reason: RejectionReason | null;
    signal: Signal;
    stake: number;
    approved_at: string | null;
    metadata: {
        session_pnl: number;
        user_drawdown: number;
        risk_profile: RiskProfile;
    };
}

type RiskGuardEvents = {
    approved: (result: ApprovalResult) => void;
    rejected: (result: ApprovalResult) => void;
};

// =============================================================================
// RISK PROFILE SETTINGS
// =============================================================================

const RISK_PROFILES: Record<RiskProfile, { maxStakeMultiplier: number; minConfidence: number }> = {
    LOW: { maxStakeMultiplier: 0.5, minConfidence: 0.8 },
    MEDIUM: { maxStakeMultiplier: 1.0, minConfidence: 0.65 },
    HIGH: { maxStakeMultiplier: 1.5, minConfidence: 0.5 },
};

// =============================================================================
// RISK GUARD
// =============================================================================

export class RiskGuard extends EventEmitter<RiskGuardEvents> {
    constructor() {
        super();
        logger.info('RiskGuard Initialized');
    }

    // ---------------------------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------------------------

    /**
     * Validate a signal against session and user risk configs
     */
    validate(
        signal: Signal,
        sessionConfig: SessionRiskConfig,
        userConfig: UserRiskConfig,
        proposedStake: number = 10
    ): ApprovalResult {
        const baseResult: ApprovalResult = {
            approved: false,
            reason: null,
            signal,
            stake: proposedStake,
            approved_at: null,
            metadata: {
                session_pnl: sessionConfig.current_pnl,
                user_drawdown: userConfig.current_drawdown,
                risk_profile: sessionConfig.risk_profile,
            },
        };

        // Priority 1: User-level limits (highest priority)
        const userCheck = this.checkUserLimits(userConfig);
        if (userCheck) {
            return this.createRejection(baseResult, userCheck);
        }

        // Priority 2: Session limits
        const sessionCheck = this.checkSessionLimits(sessionConfig);
        if (sessionCheck) {
            return this.createRejection(baseResult, sessionCheck);
        }

        // Priority 3: Signal validation against config
        const signalCheck = this.checkSignalRequirements(signal, sessionConfig);
        if (signalCheck) {
            return this.createRejection(baseResult, signalCheck);
        }

        // Priority 4: Stake validation
        const stakeCheck = this.checkStake(proposedStake, sessionConfig);
        if (stakeCheck) {
            return this.createRejection(baseResult, stakeCheck);
        }

        // All checks passed - approved
        const approvedResult: ApprovalResult = {
            ...baseResult,
            approved: true,
            approved_at: new Date().toISOString(),
        };

        this.emit('approved', approvedResult);
        logger.info(`Approved signal: ${signal.type} ${signal.market}`, {
            confidence: signal.confidence,
            market: signal.market,
            type: signal.type
        });

        return approvedResult;
    }

    // ---------------------------------------------------------------------------
    // USER LIMIT CHECKS (Priority 1)
    // ---------------------------------------------------------------------------

    private checkUserLimits(config: UserRiskConfig): RejectionReason | null {
        // Check if user has opted out
        if (config.is_opted_out) {
            return 'USER_OPTED_OUT';
        }

        // Check max drawdown
        if (config.current_drawdown >= config.max_drawdown) {
            return 'USER_MAX_DRAWDOWN_REACHED';
        }

        // Check daily loss limit
        if (config.current_daily_loss >= config.max_daily_loss) {
            return 'USER_DAILY_LOSS_LIMIT';
        }

        // Check trades per session
        if (config.trades_today >= config.max_trades_per_session) {
            return 'USER_MAX_TRADES_REACHED';
        }

        return null;
    }

    // ---------------------------------------------------------------------------
    // SESSION LIMIT CHECKS (Priority 2)
    // ---------------------------------------------------------------------------

    private checkSessionLimits(config: SessionRiskConfig): RejectionReason | null {
        // Check if session is paused
        if (config.is_paused) {
            return 'SESSION_PAUSED';
        }

        // Check global loss threshold
        if (config.current_pnl <= -config.global_loss_threshold) {
            return 'SESSION_LOSS_THRESHOLD';
        }

        return null;
    }

    // ---------------------------------------------------------------------------
    // SIGNAL REQUIREMENT CHECKS (Priority 3)
    // ---------------------------------------------------------------------------

    private checkSignalRequirements(
        signal: Signal,
        config: SessionRiskConfig
    ): RejectionReason | null {
        // Check market allowed
        if (!config.allowed_markets.includes(signal.market)) {
            return 'MARKET_NOT_ALLOWED';
        }

        // Get risk profile settings
        const profileSettings = RISK_PROFILES[config.risk_profile];

        // Check minimum confidence based on risk profile
        const requiredConfidence = Math.max(config.min_confidence, profileSettings.minConfidence);
        if (signal.confidence < requiredConfidence) {
            return 'MIN_CONFIDENCE_NOT_MET';
        }

        return null;
    }

    // ---------------------------------------------------------------------------
    // STAKE VALIDATION (Priority 4)
    // ---------------------------------------------------------------------------

    private checkStake(stake: number, config: SessionRiskConfig): RejectionReason | null {
        const profileSettings = RISK_PROFILES[config.risk_profile];
        const adjustedMaxStake = config.max_stake * profileSettings.maxStakeMultiplier;

        if (stake > adjustedMaxStake) {
            return 'SESSION_MAX_STAKE_EXCEEDED';
        }

        return null;
    }

    // ---------------------------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------------------------

    private createRejection(
        baseResult: ApprovalResult,
        reason: RejectionReason
    ): ApprovalResult {
        const result: ApprovalResult = {
            ...baseResult,
            approved: false,
            reason,
        };

        this.emit('rejected', result);
        logger.info(`Rejected signal: ${reason}`, { reason });

        return result;
    }

    /**
     * Calculate recommended stake based on risk profile
     */
    calculateRecommendedStake(
        baseStake: number,
        sessionConfig: SessionRiskConfig,
        userConfig: UserRiskConfig
    ): number {
        const profileSettings = RISK_PROFILES[sessionConfig.risk_profile];
        let stake = baseStake * profileSettings.maxStakeMultiplier;

        // Reduce stake if approaching drawdown limit
        const drawdownRatio = userConfig.current_drawdown / userConfig.max_drawdown;
        if (drawdownRatio > 0.5) {
            stake *= (1 - drawdownRatio) * 2; // Linear reduction
        }

        // Reduce stake if approaching daily loss limit
        const lossRatio = userConfig.current_daily_loss / userConfig.max_daily_loss;
        if (lossRatio > 0.5) {
            stake *= (1 - lossRatio) * 2;
        }

        return Math.max(1, Math.round(stake * 100) / 100);
    }

    /**
     * Get risk profile description
     */
    getRiskProfileInfo(profile: RiskProfile): { maxStakeMultiplier: number; minConfidence: number } {
        return RISK_PROFILES[profile];
    }
}

// Export singleton instance
export const riskGuard = new RiskGuard();
