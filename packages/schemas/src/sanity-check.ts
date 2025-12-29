/**
 * TraderMind Day 6 - Sanity Check Script
 * Validates all schemas, events, and contracts
 */

import {
    // Entity schemas
    validateUser,
    validateSession,
    validateParticipant,
    validateSignal,
    validateTradeResult,
    // Event schemas
    validateWebSocketEvent,
    WebSocketEventType,
    // Contract schemas
    validateTickArray,
    validateProposedSignal,
    validateApprovedTrade,
    // Safe validators
    safeValidateUser,
    safeValidateSignal,
} from './index.js';

// =============================================================================
// TEST DATA - Valid Objects
// =============================================================================

const validUser = {
    id: 'user-001',
    email: 'trader@example.com',
    role: 'user' as const,
    deriv_token_encrypted: 'aes256gcm_encrypted_token_here',
};

const validSession = {
    id: 'session-001',
    status: 'ACTIVE' as const,
    config_json: {
        max_participants: 10,
        min_balance: 100,
        risk_profile: 'MEDIUM',
        allowed_markets: ['R_100', 'R_50'],
    },
    created_at: '2024-01-15T10:30:00Z',
};

const validParticipant = {
    user_id: 'user-001',
    session_id: 'session-001',
    status: 'ACTIVE' as const,
    pnl: 125.50,
};

const validSignal = {
    type: 'CALL' as const,
    confidence: 0.85,
    reason: 'RSI_OVERSOLD',
    market: 'R_100',
    timestamp: '2024-01-15T10:30:00Z',
};

const validTradeResult = {
    status: 'WIN' as const,
    profit: 15.25,
    metadata_json: {
        signal_type: 'CALL',
        execution_latency_ms: 45,
        idempotency_key: 'idem-001',
    },
};

const validTicks = [
    { market: 'R_100', quote: 1234.56, timestamp: 1705312200000 },
    { market: 'R_100', quote: 1234.78, timestamp: 1705312201000 },
    { market: 'R_100', quote: 1234.90, timestamp: 1705312202000 },
];

const validProposedSignal = {
    ...validSignal,
    session_id: 'session-001',
    strategy_version: 'mean_reversion_v2',
};

const validApprovedTrade = {
    trade_id: 'trade-001',
    signal: validSignal,
    session_id: 'session-001',
    user_id: 'user-001',
    stake: 10.00,
    type: 'CALL' as const,
    market: 'R_100',
    idempotency_key: 'idem-trade-001',
    approved_at: '2024-01-15T10:30:05Z',
};

// =============================================================================
// WEBSOCKET EVENTS
// =============================================================================

const validEvents = [
    {
        type: WebSocketEventType.SESSION_CREATED,
        payload: { session: validSession },
        timestamp: '2024-01-15T10:30:00Z',
    },
    {
        type: WebSocketEventType.SESSION_JOINED,
        payload: { participant: validParticipant, session_id: 'session-001' },
        timestamp: '2024-01-15T10:30:01Z',
    },
    {
        type: WebSocketEventType.SIGNAL_EMITTED,
        payload: { signal: validSignal, session_id: 'session-001' },
        timestamp: '2024-01-15T10:30:02Z',
    },
    {
        type: WebSocketEventType.TRADE_EXECUTED,
        payload: {
            trade: validTradeResult,
            session_id: 'session-001',
            user_id: 'user-001',
        },
        timestamp: '2024-01-15T10:30:03Z',
    },
    {
        type: WebSocketEventType.RISK_APPROVED,
        payload: {
            signal: validSignal,
            session_id: 'session-001',
            approved_at: '2024-01-15T10:30:04Z',
        },
        timestamp: '2024-01-15T10:30:04Z',
    },
    {
        type: WebSocketEventType.SESSION_TERMINATED,
        payload: {
            session_id: 'session-001',
            reason: 'ADMIN_TERMINATED',
            terminated_at: '2024-01-15T11:00:00Z',
        },
        timestamp: '2024-01-15T11:00:00Z',
    },
];

// =============================================================================
// INVALID DATA - Should Fail
// =============================================================================

const invalidUser = { id: 123, email: 'not-an-email' };
const invalidSignal = { type: 'INVALID', confidence: 2.0 };
const invalidSession = { status: 'UNKNOWN' };

// =============================================================================
// RUN SANITY CHECKS
// =============================================================================

interface CheckResult {
    name: string;
    passed: boolean;
    error?: string;
}

const results: CheckResult[] = [];

function check(name: string, fn: () => void): void {
    try {
        fn();
        results.push({ name, passed: true });
        console.log(`✅ ${name}`);
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.push({ name, passed: false, error });
        console.log(`❌ ${name}: ${error}`);
    }
}

console.log('\n=== TraderMind Sanity Check ===\n');
console.log('--- Entity Validation ---');

check('User schema validates', () => {
    validateUser(validUser);
});

check('Session schema validates', () => {
    validateSession(validSession);
});

check('Participant schema validates', () => {
    validateParticipant(validParticipant);
});

check('Signal schema validates', () => {
    validateSignal(validSignal);
});

check('TradeResult schema validates', () => {
    validateTradeResult(validTradeResult);
});

console.log('\n--- Contract Validation ---');

check('Tick[] schema validates', () => {
    validateTickArray(validTicks);
});

check('ProposedSignal schema validates', () => {
    validateProposedSignal(validProposedSignal);
});

check('ApprovedTrade schema validates', () => {
    validateApprovedTrade(validApprovedTrade);
});

console.log('\n--- WebSocket Event Validation ---');

for (const event of validEvents) {
    check(`Event ${event.type} validates`, () => {
        validateWebSocketEvent(event);
    });
}

console.log('\n--- Invalid Data Rejection ---');

check('Invalid user rejected', () => {
    const result = safeValidateUser(invalidUser);
    if (result !== null) throw new Error('Should have been rejected');
});

check('Invalid signal rejected', () => {
    const result = safeValidateSignal(invalidSignal);
    if (result !== null) throw new Error('Should have been rejected');
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n=== Summary ===\n');
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

if (failed === 0) {
    console.log('\n🎉 SANITY CHECK PASSED - Repo ready for core features!\n');
    process.exit(0);
} else {
    console.log('\n⚠️  Some checks failed. Review errors above.\n');
    process.exit(1);
}
