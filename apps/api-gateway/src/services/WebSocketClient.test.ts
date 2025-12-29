/**
 * WebSocket Client Test Script
 * Tests WebSocket connection and event handling
 */

import { io, Socket } from 'socket.io-client';

const API_URL = process.env['API_URL'] ?? 'http://localhost:4000';

interface ConnectedData {
    socketId: string;
    userId: string;
    isAuthenticated: boolean;
}

interface SessionData {
    sessionId?: string;
    success?: boolean;
    session?: unknown;
}

async function runTests(): Promise<void> {
    console.log('=== WebSocket Client Tests ===\n');
    console.log(`Connecting to: ${API_URL}\n`);

    const socket: Socket = io(API_URL, {
        transports: ['websocket'],
        auth: {
            token: 'test-token',
            userId: 'test_user_001',
        },
    });

    // Connection promise
    const connected = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            console.log('✅ Connected:', socket.id);
            resolve();
        });

        socket.on('connect_error', (err: Error) => {
            clearTimeout(timeout);
            reject(err);
        });
    });

    try {
        await connected;

        // Test 1: Connection acknowledgment
        console.log('\nTest 1: Connection acknowledgment');
        socket.on('connected', (data: ConnectedData) => {
            console.log('  Received:', JSON.stringify(data));
            console.log('  ✅ Connection ack received\n');
        });

        // Wait for ack
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Test 2: Create session
        console.log('Test 2: Create session');
        socket.emit('session:create', { config: { max_participants: 5 } });

        const sessionCreated = await new Promise<SessionData | null>((resolve) => {
            socket.once('session:created', (data: SessionData) => resolve(data));
            setTimeout(() => resolve(null), 2000);
        });

        if (sessionCreated) {
            console.log('  Session created:', JSON.stringify(sessionCreated).slice(0, 100) + '...');
            console.log('  ✅ session:create works\n');
        } else {
            console.log('  ⚠️  No session:created event received\n');
        }

        // Test 3: Join session
        console.log('Test 3: Join session');
        socket.emit('session:join', { sessionId: 'test_session_001' });

        const sessionJoined = await new Promise<SessionData | null>((resolve) => {
            socket.once('session:joined', (data: SessionData) => resolve(data));
            setTimeout(() => resolve(null), 2000);
        });

        if (sessionJoined) {
            console.log('  Joined:', JSON.stringify(sessionJoined));
            console.log('  ✅ session:join works\n');
        } else {
            console.log('  ⚠️  No session:joined event (session may not exist)\n');
        }

        // Test 4: Leave session  
        console.log('Test 4: Leave session');
        socket.emit('session:leave', { sessionId: 'test_session_001' });

        const sessionLeft = await new Promise<SessionData | null>((resolve) => {
            socket.once('session:left', (data: SessionData) => resolve(data));
            setTimeout(() => resolve(null), 2000);
        });

        if (sessionLeft) {
            console.log('  Left:', JSON.stringify(sessionLeft));
            console.log('  ✅ session:leave works\n');
        } else {
            console.log('  ⚠️  No session:left event\n');
        }

        // Listen for broadcast events
        console.log('Test 5: Listen for broadcast events');
        socket.on('session_created', (data: unknown) => {
            console.log('  [Broadcast] SESSION_CREATED:', JSON.stringify(data).slice(0, 80) + '...');
        });

        socket.on('session_joined', (data: unknown) => {
            console.log('  [Broadcast] SESSION_JOINED:', JSON.stringify(data));
        });

        socket.on('signal_emitted', (data: unknown) => {
            console.log('  [Broadcast] SIGNAL_EMITTED:', JSON.stringify(data));
        });

        socket.on('trade_executed', (data: unknown) => {
            console.log('  [Broadcast] TRADE_EXECUTED:', JSON.stringify(data));
        });

        console.log('  Listening for events... (will disconnect in 3s)\n');
        await new Promise((resolve) => setTimeout(resolve, 3000));

        console.log('=== Tests Complete ===\n');
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        socket.disconnect();
        console.log('Disconnected');
        process.exit(0);
    }
}

runTests().catch(console.error);
