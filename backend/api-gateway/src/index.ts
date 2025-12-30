/**
 * TraderMind API Gateway
 * Express + Socket.IO server with structured routes and WebSocket
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';

// Route imports
import authRoutes from './routes/auth.js';
import sessionsRoutes from './routes/sessions.js';
import usersRoutes from './routes/users.js';
import tradesRoutes from './routes/trades.js';

// Services
import { initWebSocketServer, getWebSocketServer } from './services/WebSocketServer.js';
import { sessionRegistry } from './services/SessionRegistry.js';
import './services/ShadowLogger.js'; // Initialize Shadow Logger

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket Server
const wsServer = initWebSocketServer(httpServer);

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:4173',
            'https://deriv-ws-frontend.vercel.app',
            process.env['CORS_ORIGIN']
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow all Vercel Preview deployments
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        console.log('Blocked by CORS:', origin);
        callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

// Request logging
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path} [Origin: ${req.headers.origin}]`);
    next();
});

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.get('/health', (_req, res) => {
    const wsStats = wsServer.getStats();
    const registryStats = sessionRegistry.getStats();
    res.json({
        status: 'healthy',
        service: 'api-gateway',
        websocket: wsStats,
        sessions: registryStats,
    });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sessions', sessionsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/trades', tradesRoutes);

// Legacy routes (without /api/v1 prefix for backward compatibility)
app.use('/auth', authRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/users', usersRoutes);
app.use('/trades', tradesRoutes);

// API status
app.get('/api/v1/status', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket stats endpoint
app.get('/api/v1/ws/stats', (_req, res) => {
    const stats = wsServer.getStats();
    res.json(stats);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// =============================================================================
// START SERVER
// =============================================================================

const PORT = process.env['PORT'] ?? 4000;


// Recover state before accepting traffic
sessionRegistry.recoverStateFromDB().then((count) => {
    console.log(`[Startup] Recovered ${count} active sessions.`);

    httpServer.listen(PORT, () => {
        console.log(`API Gateway started on port ${PORT}`);
        console.log(`WebSocket server ready`);
        console.log(`Routes: /auth, /sessions, /users, /trades`);
    });
}).catch(err => {
    console.error('[Startup] Failed to recover state:', err);
    process.exit(1);
});

export { app, httpServer, getWebSocketServer, sessionRegistry };
