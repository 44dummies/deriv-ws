
import { logger } from '../utils/logger.js';

// ThresholdResolver.ts
// Decouples numeric thresholds from execution logic.

export interface ThresholdConfig {
    rsi: {
        oversold: number;
        overbought: number;
    };
    confidence: {
        min: number;
        volatilityPenalty: number;
        baseMultiplier: number;
        baseOffset: number;
        crossMax: number; // Max confidence cap for crosses (0.95)
    };
    weights: {
        momentum: number; // Multiplier for momentum impact
    };
}

export class ThresholdResolver {

    // Default configuration mirrors original hardcoded values
    private readonly defaults: ThresholdConfig = {
        rsi: {
            oversold: 30,
            overbought: 70
        },
        confidence: {
            min: 0.6,
            volatilityPenalty: 0.9,
            baseMultiplier: 0.8,
            baseOffset: 0.2,
            crossMax: 0.95
        },
        weights: {
            momentum: 2
        }
    };

    constructor() {
        logger.info('[ThresholdResolver] Initialized');
    }

    /**
     * Resolve thresholds for a specific market context.
     * Currently returns defaults, but designed to switch based on inputs.
     */
    public resolve(market: string, regime?: string, _strategyVersion: string = 'v1'): ThresholdConfig {
        // FUTURE: Load overrides from DB or Config Map based on regime
        // e.g., if (regime === 'HIGH_VOLATILITY') return { ...this.defaults, confidence: { ...min: 0.7 } }

        return this.defaults;
    }
}

// Singleton export
export const thresholdResolver = new ThresholdResolver();
