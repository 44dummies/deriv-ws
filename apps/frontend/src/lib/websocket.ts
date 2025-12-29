/**
 * TraderMind Frontend - WebSocket Connection Test
 * Socket.IO client for connecting to API Gateway
 */

import { io, Socket } from 'socket.io-client';

// =============================================================================
// WEBSOCKET CLIENT
// =============================================================================

const API_GATEWAY_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function connectWebSocket(): Socket {
    if (socket?.connected) {
        console.log('WebSocket already connected');
        return socket;
    }

    const token = localStorage.getItem('sb-access-token'); // Retrieve Supabase token if available

    console.log(`Connecting to WebSocket: ${API_GATEWAY_URL}`);

    socket = io(API_GATEWAY_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
            token,
        },
    });

    socket.on('connect', () => {
        console.log(`✅ WebSocket connected: ${socket?.id}`);
    });

    socket.on('disconnect', (reason) => {
        console.log(`WebSocket disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error.message);
    });

    // Session events
    socket.on('session:created', (data) => {
        console.log('Event: session:created', data);
    });

    socket.on('session:joined', (data) => {
        console.log('Event: session:joined', data);
    });

    // Validated Event Listeners (matches backend)
    socket.on('signal_emitted', (data) => {
        console.log('Event: signal_emitted', data);
    });

    socket.on('trade_executed', (data) => {
        console.log('Event: trade_executed', data);
    });

    socket.on('risk_approved', (data) => {
        console.log('Event: risk_approved', data);
    });

    return socket;
}

export function disconnectWebSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('WebSocket disconnected manually');
    }
}

export function joinSession(sessionId: string): void {
    if (!socket?.connected) {
        console.error('WebSocket not connected');
        return;
    }
    socket.emit('session:join', { sessionId });
    console.log(`Joining session: ${sessionId}`);
}

export function leaveSession(sessionId: string): void {
    if (!socket?.connected) {
        console.error('WebSocket not connected');
        return;
    }
    socket.emit('session:leave', { sessionId });
    console.log(`Leaving session: ${sessionId}`);
}

export function getSocket(): Socket | null {
    return socket;
}

// =============================================================================
// TEST FUNCTION
// =============================================================================

export async function testWebSocketHandshake(): Promise<boolean> {
    return new Promise((resolve) => {
        const testSocket = io(API_GATEWAY_URL, {
            transports: ['websocket'],
            timeout: 5000,
        });

        const timeout = setTimeout(() => {
            console.log('❌ WebSocket handshake timeout');
            testSocket.disconnect();
            resolve(false);
        }, 5000);

        testSocket.on('connect', () => {
            clearTimeout(timeout);
            console.log(`✅ WebSocket handshake successful: ${testSocket.id}`);
            testSocket.disconnect();
            resolve(true);
        });

        testSocket.on('connect_error', (error) => {
            clearTimeout(timeout);
            console.log(`❌ WebSocket handshake failed: ${error.message}`);
            testSocket.disconnect();
            resolve(false);
        });
    });
}
