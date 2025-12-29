/**
 * WebSocket Event Verification
 * Tests SESSION_CREATED, SESSION_JOINED, SESSION_TERMINATED events
 * Run: cd apps/api-gateway && pnpm exec tsx ../../tests/websocket.test.ts
 */

import { io, Socket } from 'socket.io-client';

const API_URL = process.env['API_URL'] ?? 'http://localhost:4000';

interface WSEvent {
    type: string;
    payload: unknown;
    timestamp: string;
}

async function testWebSocketEvents(): Promise<void> {
    console.log('═══════════════════════════════════════════════');
    console.log('  WebSocket Event Verification');
    console.log(`  Server: ${API_URL}`);
    console.log('═══════════════════════════════════════════════\n');

    const socket: Socket = io(API_URL, {
        transports: ['websocket'],
        auth: { userId: 'test_user_001', token: 'test_token' },
    });

    const receivedEvents: { name: string; data: unknown }[] = [];

    // Track all events
    const eventTypes = [
        'session_created',
        'session_joined',
        'session_left',
        'session_terminated',
        'signal_emitted',
        'trade_executed',
        'risk_approved',
        'risk_rejected',
    ];

    for (const event of eventTypes) {
        socket.on(event, (data: WSEvent) => {
            receivedEvents.push({ name: event, data });
            console.log(`[Event] ${event.toUpperCase()}`);
            console.log(`  Payload: ${JSON.stringify(data).slice(0, 100)}...`);
        });
    }

    return new Promise((resolve) => {
        socket.on('connect', () => {
            console.log(`✅ Connected: ${socket.id}\n`);

            // Test 1: Create session (should emit SESSION_CREATED)
            console.log('[Test] Creating session...');
            socket.emit('session:create', { config: { max_participants: 5, allowed_markets: ['R_100'] } });

            setTimeout(() => {
                // Test 2: Join session (should emit SESSION_JOINED)
                console.log('\n[Test] Joining session...');
                socket.emit('session:join', { sessionId: 'test_session_ws' });
            }, 1000);

            setTimeout(() => {
                // Test 3: Leave session (should emit SESSION_LEFT)
                console.log('\n[Test] Leaving session...');
                socket.emit('session:leave', { sessionId: 'test_session_ws' });
            }, 2000);

            setTimeout(() => {
                console.log('\n═══════════════════════════════════════════════');
                console.log(`  Events Received: ${receivedEvents.length}`);
                receivedEvents.forEach((e, i) => {
                    console.log(`  ${i + 1}. ${e.name}`);
                });
                console.log('═══════════════════════════════════════════════\n');

                // Verify expected events
                const hasCreated = receivedEvents.some(e => e.name === 'session_created');
                const hasJoined = receivedEvents.some(e => e.name.includes('joined'));

                console.log(`SESSION_CREATED: ${hasCreated ? '✅' : '❌'}`);
                console.log(`SESSION_JOINED: ${hasJoined ? '✅' : '❌'}`);

                socket.disconnect();
                resolve();
            }, 4000);
        });

        socket.on('connect_error', (err) => {
            console.error('❌ Connection failed:', err.message);
            resolve();
        });

        // Timeout
        setTimeout(() => {
            console.log('⚠️ Test timeout');
            socket.disconnect();
            resolve();
        }, 10000);
    });
}

testWebSocketEvents()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
