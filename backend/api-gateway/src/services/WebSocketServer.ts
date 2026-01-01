/**
 * TraderMind WebSocket Server
 * Real-time communication layer with Socket.IO
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { sessionRegistry, SessionState, Participant } from './SessionRegistry.js';
import { AuthService } from './AuthService.js';

// =============================================================================
// TYPES
// =============================================================================

export type WSEventType =
    | 'SESSION_CREATED'
    | 'SESSION_JOINED'
    | 'SESSION_LEFT'
    | 'SESSION_UPDATED'
    | 'SESSION_TERMINATED'
    | 'SIGNAL_EMITTED'
    | 'TRADE_EXECUTED'
    | 'RISK_APPROVED'
    | 'RISK_REJECTED'
    | 'ERROR';

export interface WSEvent<T = unknown> {
    type: WSEventType;
    payload: T;
    timestamp: string;
}

export interface AuthSocket extends Socket {
    userId?: string;
    userEmail?: string;
    userRole?: 'ADMIN' | 'USER';
    isAuthenticated?: boolean;
}

// =============================================================================
// WEBSOCKET SERVER
// =============================================================================

export class WebSocketServer {
    private io: SocketIOServer;
    private connectedClients: Map<string, AuthSocket> = new Map();
    private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds

    constructor(httpServer: HTTPServer) {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
                methods: ['GET', 'POST'],
            },
        });

        this.setupMiddleware();
        this.setupEventHandlers();

        console.log('[WebSocketServer] Initialized');
    }

    // ---------------------------------------------------------------------------
    // MIDDLEWARE
    // ---------------------------------------------------------------------------

    private setupMiddleware(): void {
        // Authentication middleware with proper JWT validation
        this.io.use(async (socket: AuthSocket, next) => {
            const token = socket.handshake.auth['token'] as string | undefined;

            if (!token) {
                // Allow guest connections for public data streams
                socket.userId = 'guest';
                socket.isAuthenticated = false;
                console.log(`[WebSocketServer] Guest connection: ${socket.id}`);
                return next();
            }

            try {
                // Verify JWT token using AuthService
                const payload = await AuthService.verifySessionToken(token);
                
                if (payload) {
                    socket.userId = payload.userId;
                    socket.userEmail = payload.email;
                    socket.userRole = payload.role as 'ADMIN' | 'USER';
                    socket.isAuthenticated = true;
                    console.log(`[WebSocketServer] Authenticated: ${socket.userId} (${socket.userRole})`);
                    return next();
                }

                // Token verification failed
                console.warn(`[WebSocketServer] Invalid token for socket: ${socket.id}`);
                socket.userId = 'guest';
                socket.isAuthenticated = false;
                return next();
                
            } catch (error) {
                console.error(`[WebSocketServer] Auth error:`, error);
                socket.userId = 'guest';
                socket.isAuthenticated = false;
                return next();
            }
        });
    }

    // ---------------------------------------------------------------------------
    // EVENT HANDLERS
    // ---------------------------------------------------------------------------

    private setupEventHandlers(): void {
        this.io.on('connection', (socket: AuthSocket) => {
            this.handleConnection(socket);

            socket.on('disconnect', () => this.handleDisconnect(socket));
            socket.on('session:join', (data) => this.handleSessionJoin(socket, data));
            socket.on('session:leave', (data) => this.handleSessionLeave(socket, data));
            socket.on('session:create', (data) => this.handleSessionCreate(socket, data));
        });
    }

    private handleConnection(socket: AuthSocket): void {
        this.connectedClients.set(socket.id, socket);

        if (socket.userId) {
            if (!this.userSockets.has(socket.userId)) {
                this.userSockets.set(socket.userId, new Set());
            }
            this.userSockets.get(socket.userId)!.add(socket.id);
        }

        console.log(`[WebSocketServer] Client connected: ${socket.id} (user: ${socket.userId})`);

        // Send connection ack
        socket.emit('connected', {
            socketId: socket.id,
            userId: socket.userId,
            isAuthenticated: socket.isAuthenticated,
        });
    }

    private handleDisconnect(socket: AuthSocket): void {
        this.connectedClients.delete(socket.id);

        if (socket.userId) {
            this.userSockets.get(socket.userId)?.delete(socket.id);
        }

        console.log(`[WebSocketServer] Client disconnected: ${socket.id}`);
    }

    private handleSessionJoin(socket: AuthSocket, data: { sessionId: string }): void {
        const { sessionId } = data;

        try {
            // Add participant to registry if authenticated
            if (socket.userId && socket.isAuthenticated) {
                sessionRegistry.addParticipant(sessionId, socket.userId);
            }

            // Join Socket.IO room
            void socket.join(`session:${sessionId}`);
            console.log(`[WebSocketServer] ${socket.userId} joined session ${sessionId}`);

            // Emit to room
            this.emitToSession(sessionId, 'SESSION_JOINED', {
                session_id: sessionId,
                user_id: socket.userId,
                socket_id: socket.id,
            });

            // Confirm to client
            socket.emit('session:joined', { sessionId, success: true });
        } catch (err) {
            socket.emit('error', { message: (err as Error).message });
        }
    }

    private handleSessionLeave(socket: AuthSocket, data: { sessionId: string }): void {
        const { sessionId } = data;

        try {
            // Remove participant from registry
            if (socket.userId && socket.isAuthenticated) {
                sessionRegistry.removeParticipant(sessionId, socket.userId);
            }

            // Leave Socket.IO room
            void socket.leave(`session:${sessionId}`);
            console.log(`[WebSocketServer] ${socket.userId} left session ${sessionId}`);

            // Emit to room
            this.emitToSession(sessionId, 'SESSION_LEFT', {
                session_id: sessionId,
                user_id: socket.userId,
            });

            socket.emit('session:left', { sessionId, success: true });
        } catch (err) {
            socket.emit('error', { message: (err as Error).message });
        }
    }

    private handleSessionCreate(socket: AuthSocket, data: { config?: Record<string, unknown> }): void {
        if (!socket.isAuthenticated) {
            socket.emit('error', { message: 'Authentication required' });
            return;
        }

        try {
            const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const session = sessionRegistry.createSession({
                id: sessionId,
                config_json: data.config ?? {},
                admin_id: socket.userId ?? undefined,
            });

            // Emit to creator
            socket.emit('session:created', { session: this.serializeSession(session) });

            // Broadcast to all connected clients
            this.emitToAll('SESSION_CREATED', { session: this.serializeSession(session) });

            console.log(`[WebSocketServer] Session created: ${sessionId} by ${socket.userId}`);
        } catch (err) {
            socket.emit('error', { message: (err as Error).message });
        }
    }

    // ---------------------------------------------------------------------------
    // EMIT METHODS
    // ---------------------------------------------------------------------------

    /**
     * Emit event to specific session room
     */
    emitToSession<T>(sessionId: string, type: WSEventType, payload: T): void {
        const event: WSEvent<T> = {
            type,
            payload,
            timestamp: new Date().toISOString(),
        };
        this.io.to(`session:${sessionId}`).emit(type.toLowerCase(), event);
        console.log(`[WebSocketServer] Emitted ${type} to session ${sessionId}`);
    }

    /**
     * Emit event to specific user (all their sockets)
     */
    emitToUser<T>(userId: string, type: WSEventType, payload: T): void {
        const socketIds = this.userSockets.get(userId);
        if (!socketIds) return;

        const event: WSEvent<T> = {
            type,
            payload,
            timestamp: new Date().toISOString(),
        };

        for (const socketId of socketIds) {
            this.io.to(socketId).emit(type.toLowerCase(), event);
        }
    }

    /**
     * Emit event to all connected clients
     */
    emitToAll<T>(type: WSEventType, payload: T): void {
        const event: WSEvent<T> = {
            type,
            payload,
            timestamp: new Date().toISOString(),
        };
        this.io.emit(type.toLowerCase(), event);
    }

    // ---------------------------------------------------------------------------
    // SESSION EVENT EMITTERS
    // ---------------------------------------------------------------------------

    /**
     * Emit SESSION_CREATED event
     */
    emitSessionCreated(session: SessionState): void {
        this.emitToAll('SESSION_CREATED', { session: this.serializeSession(session) });
    }

    /**
     * Emit SESSION_JOINED event
     */
    emitSessionJoined(sessionId: string, participant: Participant): void {
        this.emitToSession(sessionId, 'SESSION_JOINED', {
            session_id: sessionId,
            participant,
        });
    }

    /**
     * Emit SIGNAL_EMITTED event
     */
    emitSignal(sessionId: string, signal: unknown): void {
        this.emitToSession(sessionId, 'SIGNAL_EMITTED', {
            session_id: sessionId,
            signal,
        });
    }

    /**
     * Emit TRADE_EXECUTED event
     */
    emitTradeExecuted(sessionId: string, userId: string, trade: unknown): void {
        this.emitToSession(sessionId, 'TRADE_EXECUTED', {
            session_id: sessionId,
            user_id: userId,
            trade,
        });
    }

    /**
     * Emit RISK_APPROVED event
     */
    emitRiskApproved(sessionId: string, signal: unknown): void {
        this.emitToSession(sessionId, 'RISK_APPROVED', {
            session_id: sessionId,
            signal,
            approved_at: new Date().toISOString(),
        });
    }

    /**
     * Emit SESSION_TERMINATED event
     */
    emitSessionTerminated(sessionId: string, reason: string): void {
        this.emitToSession(sessionId, 'SESSION_TERMINATED', {
            session_id: sessionId,
            reason,
            terminated_at: new Date().toISOString(),
        });
    }

    // ---------------------------------------------------------------------------
    // UTILITIES
    // ---------------------------------------------------------------------------

    private serializeSession(session: SessionState): Record<string, unknown> {
        return {
            id: session.id,
            status: session.status,
            config_json: session.config_json,
            created_at: session.created_at,
            started_at: session.started_at,
            completed_at: session.completed_at,
            participants: Array.from(session.participants.values()),
            admin_id: session.admin_id,
        };
    }

    /**
     * Get connection stats
     */
    getStats(): { connections: number; users: number } {
        return {
            connections: this.connectedClients.size,
            users: this.userSockets.size,
        };
    }

    /**
     * Get Socket.IO instance (for external use)
     */
    getIO(): SocketIOServer {
        return this.io;
    }
}

// Singleton holder (initialized in index.ts)
let wsServer: WebSocketServer | null = null;

export function initWebSocketServer(httpServer: HTTPServer): WebSocketServer {
    wsServer = new WebSocketServer(httpServer);
    return wsServer;
}

export function getWebSocketServer(): WebSocketServer | null {
    return wsServer;
}
