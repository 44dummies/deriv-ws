/**
 * TraderMind Core Entity Schemas
 * PRD-compliant Zod validation - exact field matching
 */

import { z } from 'zod';

// ============================================================
// ENUMS (Shared across the system)
// ============================================================

export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

// TypeScript enum for use in code
export enum RiskLevelEnum {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}

// ============================================================
// USER
// {id, email, role, deriv_token_encrypted}
// ============================================================

export const UserRoleSchema = z.enum(['user', 'admin', 'system']);

export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    role: UserRoleSchema,
    deriv_token_encrypted: z.string().nullable(),
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;

// ============================================================
// SESSION
// {id, status, config_json, created_at}
// ============================================================

export const SessionStatusSchema = z.enum([
    'PENDING',
    'ACTIVE',
    'RUNNING',
    'PAUSED',
    'COMPLETED',
]);

export const SessionSchema = z.object({
    id: z.string(),
    status: SessionStatusSchema,
    config_json: z.record(z.string(), z.unknown()),
    created_at: z.string(),
});

export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type Session = z.infer<typeof SessionSchema>;

// ============================================================
// PARTICIPANT
// {user_id, session_id, status, pnl}
// ============================================================

export const ParticipantStatusSchema = z.enum([
    'PENDING',
    'ACTIVE',
    'FAILED',
    'REMOVED',
    'OPTED_OUT',
]);

export const ParticipantSchema = z.object({
    user_id: z.string(),
    session_id: z.string(),
    status: ParticipantStatusSchema,
    pnl: z.number(),
});

export type ParticipantStatus = z.infer<typeof ParticipantStatusSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;

// ============================================================
// SIGNAL
// {type, confidence, reason, market, timestamp}
// ============================================================

export const SignalTypeSchema = z.enum(['CALL', 'PUT']);

export const SignalSchema = z.object({
    type: SignalTypeSchema,
    confidence: z.number().min(0).max(1),
    reason: z.string(),
    market: z.string(),
    timestamp: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SignalType = z.infer<typeof SignalTypeSchema>;
export type Signal = z.infer<typeof SignalSchema>;

// ============================================================
// TRADE RESULT
// {status, profit, metadata_json}
// ============================================================

export const TradeStatusSchema = z.enum(['WIN', 'LOSS', 'TIE', 'FAILED', 'PENDING']);

export const TradeResultSchema = z.object({
    status: TradeStatusSchema,
    profit: z.number(),
    metadata_json: z.record(z.string(), z.unknown()),
});

export type TradeStatus = z.infer<typeof TradeStatusSchema>;
export type TradeResult = z.infer<typeof TradeResultSchema>;
