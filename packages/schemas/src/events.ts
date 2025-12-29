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
// EVENT PAYLOADS
// ============================================================

export const SessionCreatedPayloadSchema = z.object({
    session: SessionSchema,
});

export const SessionJoinedPayloadSchema = z.object({
    participant: ParticipantSchema,
    session_id: z.string(),
});

export const SignalEmittedPayloadSchema = z.object({
    signal: SignalSchema,
    session_id: z.string(),
});

export const TradeExecutedPayloadSchema = z.object({
    trade: TradeResultSchema,
    session_id: z.string(),
    user_id: z.string(),
});

export const RiskApprovedPayloadSchema = z.object({
    signal: SignalSchema,
    session_id: z.string(),
    approved_at: z.string(),
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
