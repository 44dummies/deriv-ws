/**
 * TraderMind Internal Service Contracts
 * Data structures for inter-service communication
 *
 * MarketData → QuantEngine: Tick[]
 * QuantEngine → RiskGuard: Signal object
 * RiskGuard → ExecutionCore: Approved trade object
 */

import { z } from 'zod';
import { SignalSchema, SignalTypeSchema } from './entities.js';

// ============================================================
// MARKET DATA → QUANT ENGINE
// Tick[]
// ============================================================

export const TickSchema = z.object({
    market: z.string(),
    quote: z.number(),
    timestamp: z.number(),
});

export const TickArraySchema = z.array(TickSchema);

export type Tick = z.infer<typeof TickSchema>;

// ============================================================
// QUANT ENGINE → RISK GUARD
// Signal object (uses entities.Signal)
// ============================================================

export const ProposedSignalSchema = SignalSchema.extend({
    session_id: z.string(),
    strategy_version: z.string(),
});

export type ProposedSignal = z.infer<typeof ProposedSignalSchema>;

// ============================================================
// RISK GUARD → EXECUTION CORE
// Approved trade object
// ============================================================

export const ApprovedTradeSchema = z.object({
    trade_id: z.string(),
    signal: SignalSchema,
    session_id: z.string(),
    user_id: z.string(),
    stake: z.number().positive(),
    type: SignalTypeSchema,
    market: z.string(),
    idempotency_key: z.string(),
    approved_at: z.string(),
});

export type ApprovedTrade = z.infer<typeof ApprovedTradeSchema>;


// ============================================================
// AI LAYER CONTRACTS
// ============================================================

export const AIInputSchema = z.object({
    features: z.object({
        rsi: z.number().min(0).max(100),
        ema_fast: z.number(),
        ema_slow: z.number(),
        atr: z.number().nonnegative(),
        momentum: z.number(),
        volatility: z.number().nonnegative(),
    }),
});

export type AIInput = z.infer<typeof AIInputSchema>;

export const AIOutputSchema = z.object({
    ai_confidence: z.number().min(0).max(1),
    market_regime: z.enum(["TRENDING", "RANGING", "VOLATILE"]),
    reason_tags: z.array(z.string()),
    model_version: z.string(),
});

export type AIOutput = z.infer<typeof AIOutputSchema>;
