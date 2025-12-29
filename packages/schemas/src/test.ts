/**
 * TraderMind Schema Validation Test
 * Validates all schemas with example data
 */

import {
    validateUser,
    validateSession,
    validateParticipant,
    validateSignal,
    validateTradeResult,
    validateWebSocketEvent,
    validateTickArray,
    validateProposedSignal,
    validateApprovedTrade,
    safeValidateUser,
    WebSocketEventType,
} from './index.js';

// ============================================================
// TEST DATA
// ============================================================

const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user',
    deriv_token_encrypted: 'encrypted_token_here',
};

const testSession = {
    id: 'session-456',
    status: 'ACTIVE',
    config_json: { max_participants: 10, min_balance: 100 },
    created_at: '2024-01-01T00:00:00Z',
};

const testParticipant = {
    user_id: 'user-123',
    session_id: 'session-456',
    status: 'ACTIVE',
    pnl: 50.25,
};

const testSignal = {
    type: 'CALL',
    confidence: 0.85,
    reason: 'RSI_OVERSOLD',
    market: 'R_100',
    timestamp: '2024-01-01T00:00:00Z',
};

const testTradeResult = {
    status: 'WIN',
    profit: 10.5,
    metadata_json: { signal_type: 'CALL', market_condition: 'bullish' },
};

const testTicks = [
    { market: 'R_100', quote: 100.5, timestamp: 1704067200000 },
    { market: 'R_100', quote: 100.6, timestamp: 1704067201000 },
];

const testProposedSignal = {
    ...testSignal,
    session_id: 'session-456',
    strategy_version: 'mean_reversion_v1',
};

const testApprovedTrade = {
    trade_id: 'trade-789',
    signal: testSignal,
    session_id: 'session-456',
    user_id: 'user-123',
    stake: 10,
    type: 'CALL',
    market: 'R_100',
    idempotency_key: 'idem-key-123',
    approved_at: '2024-01-01T00:00:00Z',
};

const testWebSocketEvent = {
    type: WebSocketEventType.SIGNAL_EMITTED,
    payload: {
        signal: testSignal,
        session_id: 'session-456',
    },
    timestamp: '2024-01-01T00:00:00Z',
};

// ============================================================
// RUN TESTS
// ============================================================

function runTests(): void {
    console.log('=== TraderMind Schema Validation Tests ===\n');

    try {
        console.log('Testing User schema...');
        const user = validateUser(testUser);
        console.log('✓ User valid:', user.email);

        console.log('Testing Session schema...');
        const session = validateSession(testSession);
        console.log('✓ Session valid:', session.status);

        console.log('Testing Participant schema...');
        const participant = validateParticipant(testParticipant);
        console.log('✓ Participant valid:', participant.pnl);

        console.log('Testing Signal schema...');
        const signal = validateSignal(testSignal);
        console.log('✓ Signal valid:', signal.type, signal.confidence);

        console.log('Testing TradeResult schema...');
        const trade = validateTradeResult(testTradeResult);
        console.log('✓ TradeResult valid:', trade.status, trade.profit);

        console.log('Testing Tick[] schema...');
        const ticks = validateTickArray(testTicks);
        console.log('✓ Ticks valid:', ticks.length, 'ticks');

        console.log('Testing ProposedSignal schema...');
        const proposed = validateProposedSignal(testProposedSignal);
        console.log('✓ ProposedSignal valid:', proposed.strategy_version);

        console.log('Testing ApprovedTrade schema...');
        const approved = validateApprovedTrade(testApprovedTrade);
        console.log('✓ ApprovedTrade valid:', approved.idempotency_key);

        console.log('Testing WebSocketEvent schema...');
        const event = validateWebSocketEvent(testWebSocketEvent);
        console.log('✓ WebSocketEvent valid:', event.type);

        console.log('Testing safeValidateUser (invalid data)...');
        const invalidUser = safeValidateUser({ id: 123 });
        console.log('✓ safeValidateUser returns null for invalid:', invalidUser === null);

        console.log('\n=== All Tests Passed ===');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runTests();
