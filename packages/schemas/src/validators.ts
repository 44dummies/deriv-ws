/**
 * TraderMind Schema Validators
 * JSON validation functions for all entities
 */

import {
    UserSchema,
    SessionSchema,
    ParticipantSchema,
    SignalSchema,
    TradeResultSchema,
    type User,
    type Session,
    type Participant,
    type Signal,
    type TradeResult,
} from './entities.js';

import {
    WebSocketEventSchema,
    SessionCreatedPayloadSchema,
    SessionJoinedPayloadSchema,
    SignalEmittedPayloadSchema,
    TradeExecutedPayloadSchema,
    RiskApprovedPayloadSchema,
    SessionTerminatedPayloadSchema,
    type WebSocketEvent,
} from './events.js';

import {
    TickArraySchema,
    ProposedSignalSchema,
    ApprovedTradeSchema,
    type Tick,
    type ProposedSignal,
    type ApprovedTrade,
} from './contracts.js';

// ============================================================
// ENTITY VALIDATORS
// ============================================================

export function validateUser(data: unknown): User {
    return UserSchema.parse(data);
}

export function validateSession(data: unknown): Session {
    return SessionSchema.parse(data);
}

export function validateParticipant(data: unknown): Participant {
    return ParticipantSchema.parse(data);
}

export function validateSignal(data: unknown): Signal {
    return SignalSchema.parse(data);
}

export function validateTradeResult(data: unknown): TradeResult {
    return TradeResultSchema.parse(data);
}

// ============================================================
// EVENT VALIDATORS
// ============================================================

export function validateWebSocketEvent(data: unknown): WebSocketEvent {
    return WebSocketEventSchema.parse(data);
}

export function validateSessionCreatedPayload(data: unknown) {
    return SessionCreatedPayloadSchema.parse(data);
}

export function validateSessionJoinedPayload(data: unknown) {
    return SessionJoinedPayloadSchema.parse(data);
}

export function validateSignalEmittedPayload(data: unknown) {
    return SignalEmittedPayloadSchema.parse(data);
}

export function validateTradeExecutedPayload(data: unknown) {
    return TradeExecutedPayloadSchema.parse(data);
}

export function validateRiskApprovedPayload(data: unknown) {
    return RiskApprovedPayloadSchema.parse(data);
}

export function validateSessionTerminatedPayload(data: unknown) {
    return SessionTerminatedPayloadSchema.parse(data);
}

// ============================================================
// CONTRACT VALIDATORS
// ============================================================

export function validateTickArray(data: unknown): Tick[] {
    return TickArraySchema.parse(data);
}

export function validateProposedSignal(data: unknown): ProposedSignal {
    return ProposedSignalSchema.parse(data);
}

export function validateApprovedTrade(data: unknown): ApprovedTrade {
    return ApprovedTradeSchema.parse(data);
}

// ============================================================
// SAFE VALIDATORS (return null on error)
// ============================================================

export function safeValidateUser(data: unknown): User | null {
    const result = UserSchema.safeParse(data);
    return result.success ? result.data : null;
}

export function safeValidateSession(data: unknown): Session | null {
    const result = SessionSchema.safeParse(data);
    return result.success ? result.data : null;
}

export function safeValidateSignal(data: unknown): Signal | null {
    const result = SignalSchema.safeParse(data);
    return result.success ? result.data : null;
}

export function safeValidateWebSocketEvent(data: unknown): WebSocketEvent | null {
    const result = WebSocketEventSchema.safeParse(data);
    return result.success ? result.data : null;
}
