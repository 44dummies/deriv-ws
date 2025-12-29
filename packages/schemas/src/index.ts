/**
 * TraderMind Schemas Package
 * All data structures and event contracts frozen per PRD
 */

// Entities
export {
    UserRoleSchema,
    UserSchema,
    SessionStatusSchema,
    SessionSchema,
    ParticipantStatusSchema,
    ParticipantSchema,
    SignalTypeSchema,
    SignalSchema,
    TradeStatusSchema,
    TradeResultSchema,
    type UserRole,
    type User,
    type SessionStatus,
    type Session,
    type ParticipantStatus,
    type Participant,
    type SignalType,
    type Signal,
    type TradeStatus,
    type TradeResult,
} from './entities.js';

// Events
export {
    WebSocketEventType,
    WebSocketEventSchema,
    SessionCreatedPayloadSchema,
    SessionJoinedPayloadSchema,
    SignalEmittedPayloadSchema,
    TradeExecutedPayloadSchema,
    RiskApprovedPayloadSchema,
    SessionTerminatedPayloadSchema,
    type WebSocketEventTypeName,
    type WebSocketEvent,
    type SessionCreatedPayload,
    type SessionJoinedPayload,
    type SignalEmittedPayload,
    type TradeExecutedPayload,
    type RiskApprovedPayload,
    type SessionTerminatedPayload,
} from './events.js';

// Contracts
export {
    TickSchema,
    TickArraySchema,
    ProposedSignalSchema,
    ApprovedTradeSchema,
    type Tick,
    type ProposedSignal,
    type ApprovedTrade,
    AIInputSchema,
    AIOutputSchema,
    type AIInput,
    type AIOutput,
} from './contracts.js';

// Validators
export {
    validateUser,
    validateSession,
    validateParticipant,
    validateSignal,
    validateTradeResult,
    validateWebSocketEvent,
    validateSessionCreatedPayload,
    validateSessionJoinedPayload,
    validateSignalEmittedPayload,
    validateTradeExecutedPayload,
    validateRiskApprovedPayload,
    validateSessionTerminatedPayload,
    validateTickArray,
    validateProposedSignal,
    validateApprovedTrade,
    safeValidateUser,
    safeValidateSession,
    safeValidateSignal,
    safeValidateWebSocketEvent,
} from './validators.js';
