/**
 * TraderMind WebSocket Event Schemas
 * PRD-compliant: SESSION_CREATED, SESSION_JOINED, SIGNAL_EMITTED,
 * TRADE_EXECUTED, RISK_APPROVED, SESSION_TERMINATED
 */

import { z } from 'zod';
import {
    SessionSchema,
    ParticipantSchema,
    SignalSchema,
    TradeResultSchema,
} from './entities.js';

// ============================================================
// EVENT TYPES (PRD exact)
// ============================================================

export const WebSocketEventType = {
    SESSION_CREATED: 'SESSION_CREATED',
    SESSION_JOINED: 'SESSION_JOINED',
    SIGNAL_EMITTED: 'SIGNAL_EMITTED',
    TRADE_EXECUTED: 'TRADE_EXECUTED',
    RISK_APPROVED: 'RISK_APPROVED',
    SESSION_TERMINATED: 'SESSION_TERMINATED',
} as const;

export type WebSocketEventTypeName = keyof typeof WebSocketEventType;

// ============================================================
// EVENT PAYLOADS (Updated for flattened structure)
// The payload IS the entity itself, not wrapped
// ============================================================

export const SessionCreatedPayloadSchema = z.object({
    session: SessionSchema,
});

export const SessionJoinedPayloadSchema = z.object({
    participant: ParticipantSchema,
    session_id: z.string(),
});

// Signal payload IS the signal itself (flattened)
export const SignalEmittedPayloadSchema = SignalSchema.extend({
    source: z.enum(['RULE', 'AI']).optional(),
    expiry: z.string().optional(),
});

// Trade payload IS the trade result itself (flattened)
export const TradeExecutedPayloadSchema = z.object({
    tradeId: z.string(),
    userId: z.string(),
    sessionId: z.string(),
    status: z.enum(['SUCCESS', 'FAILED', 'PARTIAL']),
    profit: z.number(),
    executedAt: z.string(),
    metadata_json: z.object({
        market: z.string(),
        entryPrice: z.number().optional(),
        reason: z.string().optional(),
        risk_confidence: z.number().optional(),
        contract_id: z.union([z.number(), z.string()]).optional(),
        deriv_ref: z.union([z.number(), z.string()]).optional(),
    }),
});

// Risk payload matches frontend RiskRiskPayload
export const RiskApprovedPayloadSchema = z.object({
    checkPassed: z.boolean(),
    reason: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

// Session status update (new event for frontend)
export const SessionStatusUpdatePayloadSchema = z.object({
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']),
    reason: z.string().optional(),
});

export const SessionTerminatedPayloadSchema = z.object({
    session_id: z.string(),
    reason: z.string(),
    terminated_at: z.string(),
});

export type SessionCreatedPayload = z.infer<typeof SessionCreatedPayloadSchema>;
export type SessionJoinedPayload = z.infer<typeof SessionJoinedPayloadSchema>;
export type SignalEmittedPayload = z.infer<typeof SignalEmittedPayloadSchema>;
export type TradeExecutedPayload = z.infer<typeof TradeExecutedPayloadSchema>;
export type RiskApprovedPayload = z.infer<typeof RiskApprovedPayloadSchema>;
export type SessionStatusUpdatePayload = z.infer<typeof SessionStatusUpdatePayloadSchema>;
export type SessionTerminatedPayload = z.infer<typeof SessionTerminatedPayloadSchema>;

// ============================================================
// UNIFIED EVENT WRAPPER
// ============================================================

export const WebSocketEventSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('SESSION_CREATED'),
        payload: SessionCreatedPayloadSchema,
        timestamp: z.string(),
    }),
    z.object({
        type: z.literal('SESSION_JOINED'),
        payload: SessionJoinedPayloadSchema,
        timestamp: z.string(),
    }),
    z.object({
        type: z.literal('SIGNAL_EMITTED'),
        payload: SignalEmittedPayloadSchema,
        timestamp: z.string(),
    }),
    z.object({
        type: z.literal('TRADE_EXECUTED'),
        payload: TradeExecutedPayloadSchema,
        timestamp: z.string(),
    }),
    z.object({
        type: z.literal('RISK_APPROVED'),
        payload: RiskApprovedPayloadSchema,
        timestamp: z.string(),
    }),
    z.object({
        type: z.literal('SESSION_TERMINATED'),
        payload: SessionTerminatedPayloadSchema,
        timestamp: z.string(),
    }),
]);

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;
