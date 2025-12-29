/**
 * TraderMind Integration Tests
 * Tests auth, sessions, and WebSocket events
 * Run: cd apps/api-gateway && pnpm exec tsx ../../tests/integration.test.ts
 */

import { io, Socket } from 'socket.io-client';

const API_URL = process.env['API_URL'] ?? 'http://localhost:4000';

// =============================================================================
// TEST UTILITIES
// =============================================================================

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, error?: string): void {
    results.push({ name, passed, error });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}${error ? `: ${error}` : ''}`);
}

async function fetchJSON(path: string, options?: RequestInit): Promise<unknown> {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    return res.json();
}

// =============================================================================
// AUTH TESTS
// =============================================================================

async function testAuth(): Promise<void> {
    console.log('\n=== Auth Tests ===\n');

    // Test 1: Unauthenticated access to /auth/me
    const me = await fetchJSON('/auth/me') as { message?: string };
    test('GET /auth/me returns placeholder', me?.message?.includes('placeholder') ?? false);

    // Test 2: Login endpoint exists
    const login = await fetchJSON('/auth/login', { method: 'POST' }) as { message?: string };
    test('POST /auth/login exists', !!login?.message);

    // Test 3: Deriv connect endpoint exists
    const deriv = await fetchJSON('/auth/deriv/connect', { method: 'POST' }) as { message?: string };
    test('POST /auth/deriv/connect exists', !!deriv?.message);
}

// =============================================================================
// SESSION LIFECYCLE TESTS
// =============================================================================

async function testSessionLifecycle(): Promise<void> {
    console.log('\n=== Session Lifecycle Tests ===\n');

    // Test 1: List sessions
    const list = await fetchJSON('/sessions') as { sessions?: unknown[] };
    test('GET /sessions returns array', Array.isArray(list?.sessions));

    // Test 2: Create session
    const created = await fetchJSON('/sessions', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Session', config: { max_participants: 5 } }),
    }) as { id?: string; status?: string };
    test('POST /sessions creates session', !!created?.id);
    test('New session has PENDING status', created?.status === 'PENDING');

    // Test 3: Get session by ID
    const session = await fetchJSON('/sessions/sess_test') as { id?: string };
    test('GET /sessions/:id returns session', !!session?.id);

    // Test 4: Start session
    const started = await fetchJSON('/sessions/sess_test/start', { method: 'POST' }) as { status?: string };
    test('POST /sessions/:id/start changes status', started?.status === 'ACTIVE');

    // Test 5: Join session
    const joined = await fetchJSON('/sessions/sess_test/join', { method: 'POST' }) as { session_id?: string };
    test('POST /sessions/:id/join works', !!joined?.session_id);

    // Test 6: Leave session
    const left = await fetchJSON('/sessions/sess_test/leave', { method: 'POST' }) as { message?: string };
    test('POST /sessions/:id/leave works', !!left?.message);

    // Test 7: Stop session
    const stopped = await fetchJSON('/sessions/sess_test/stop', { method: 'POST' }) as { status?: string };
    test('POST /sessions/:id/stop changes status', stopped?.status === 'COMPLETED');
}

// =============================================================================
// WEBSOCKET TESTS
// =============================================================================

async function testWebSocket(): Promise<void> {
    console.log('\n=== WebSocket Tests ===\n');

    return new Promise((resolve) => {
        const socket: Socket = io(API_URL, {
            transports: ['websocket'],
            auth: { userId: 'test_user', token: 'test_token' },
            timeout: 5000,
        });

        const timeout = setTimeout(() => {
            test('WebSocket connection', false, 'Timeout');
            socket.disconnect();
            resolve();
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            test('WebSocket connects', true);

            // Test connection ack
            socket.once('connected', (data: { userId?: string }) => {
                test('Receives connection ack', !!data?.userId);
            });

            // Test session join
            socket.emit('session:join', { sessionId: 'test_session' });
            socket.once('session:joined', (data: { success?: boolean }) => {
                test('Session join event received', data?.success === true);
            });

            // Test session create
            socket.emit('session:create', { config: { max_participants: 5 } });
            socket.once('session:created', (data: { session?: unknown }) => {
                test('Session created event received', !!data?.session);
                socket.disconnect();
                resolve();
            });

            // Fallback timeout
            setTimeout(() => {
                socket.disconnect();
                resolve();
            }, 3000);
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            test('WebSocket connection', false, err.message);
            resolve();
        });
    });
}

// =============================================================================
// USER & TRADE TESTS
// =============================================================================

async function testUsersAndTrades(): Promise<void> {
    console.log('\n=== Users & Trades Tests ===\n');

    // Users
    const users = await fetchJSON('/users') as { users?: unknown[] };
    test('GET /users returns array', Array.isArray(users?.users));

    const user = await fetchJSON('/users/user_001') as { id?: string };
    test('GET /users/:id returns user', !!user?.id);

    // Trades
    const trades = await fetchJSON('/trades') as { trades?: unknown[] };
    test('GET /trades returns array', Array.isArray(trades?.trades));

    const trade = await fetchJSON('/trades', {
        method: 'POST',
        body: JSON.stringify({ session_id: 'sess_001', type: 'CALL', stake: 10, market: 'R_100' }),
    }) as { id?: string };
    test('POST /trades creates trade', !!trade?.id);
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

async function runAllTests(): Promise<void> {
    console.log('═══════════════════════════════════════════════');
    console.log('  TraderMind Integration Tests');
    console.log(`  API: ${API_URL}`);
    console.log('═══════════════════════════════════════════════');

    try {
        await testAuth();
        await testSessionLifecycle();
        await testWebSocket();
        await testUsersAndTrades();
    } catch (err) {
        console.error('Test error:', err);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log(`  Results: ${results.filter(r => r.passed).length}/${results.length} passed`);
    console.log('═══════════════════════════════════════════════\n');

    process.exit(results.every(r => r.passed) ? 0 : 1);
}

runAllTests().catch(console.error);
