/**
 * TraderMind Frontend - WebSocket Connection Test
 * Socket.IO client for connecting to API Gateway
 */

import { io, Socket } from 'socket.io-client';
import { logger } from './logger';

// =============================================================================
// WEBSOCKET CLIENT
// =============================================================================

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function connectWebSocket(): Socket {
    if (socket?.connected) {
        logger.debug('WebSocket already connected');
        return socket;
    }

    logger.info(`Connecting to WebSocket: ${API_GATEWAY_URL}`);

    socket = io(API_GATEWAY_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
    });

    socket.on('connect', () => {
        logger.info(`✅ WebSocket connected: ${socket?.id}`);
    });

    socket.on('disconnect', (reason) => {
        logger.warn(`WebSocket disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
        logger.error('WebSocket connection error', error);
    });

    // Session events
    socket.on('session:created', (data) => {
        logger.debug('Event: session:created', data);
    });

    socket.on('session:joined', (data) => {
        logger.debug('Event: session:joined', data);
    });

    // Validated Event Listeners (matches backend)
    socket.on('signal_emitted', (data) => {
        logger.info('Event: signal_emitted', data);
    });

    socket.on('trade_executed', (data) => {
        logger.info('Event: trade_executed', data);
    });

    socket.on('risk_approved', (data) => {
        logger.debug('Event: risk_approved', data);
    });

    return socket;
}

export function disconnectWebSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
        logger.info('WebSocket disconnected manually');
    }
}

export function joinSession(sessionId: string): void {
    if (!socket?.connected) {
        logger.error('WebSocket not connected');
        return;
    }
    socket.emit('session:join', { sessionId });
    logger.info(`Joining session: ${sessionId}`);
}

export function leaveSession(sessionId: string): void {
    if (!socket?.connected) {
        logger.error('WebSocket not connected');
        return;
    }
    socket.emit('session:leave', { sessionId });
    logger.info(`Leaving session: ${sessionId}`);
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
            withCredentials: true,
        });

        const timeout = setTimeout(() => {
            logger.error('❌ WebSocket handshake timeout');
            testSocket.disconnect();
            resolve(false);
        }, 5000);

        testSocket.on('connect', () => {
            clearTimeout(timeout);
            logger.info(`✅ WebSocket handshake successful: ${testSocket.id}`);
            testSocket.disconnect();
            resolve(true);
        });

        testSocket.on('connect_error', (error) => {
            clearTimeout(timeout);
            logger.error(`❌ WebSocket handshake failed: ${error.message}`, error);
            testSocket.disconnect();
            resolve(false);
        });
    });
}
