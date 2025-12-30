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
import statsRoutes from './routes/stats.js';

// Services
import { initWebSocketServer, getWebSocketServer } from './services/WebSocketServer.js';
import { sessionRegistry } from './services/SessionRegistry.js';
import './services/ShadowLogger.js'; // Initialize Shadow Logger

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket Server
const wsServer = initWebSocketServer(httpServer);

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sessions', sessionsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/trades', tradesRoutes);
app.use('/api/v1/stats', statsRoutes);

// Legacy routes (without /api/v1 prefix for backward compatibility)
app.use('/auth', authRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/users', usersRoutes);
app.use('/trades', tradesRoutes);
app.use('/stats', statsRoutes);

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

// =============================================================================
// START SERVER
// =============================================================================

const PORT = process.env['PORT'] ?? 3000;
console.log('[Startup] Initializing TraderMind API Gateway...');
console.log(`[Startup] Environment: ${process.env['NODE_ENV']}`);
console.log(`[Startup] CORS Origin Config: ${process.env['CORS_ORIGIN']}`);

// Start listening immediately to ensure health checks and CORS work
httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Startup] API Gateway started on port ${PORT}`);
    console.log(`[Startup] WebSocket server ready`);
    console.log(`[Startup] Routes: /auth, /sessions, /users, /trades`);

    // Log uncaught exceptions to prevent silent crashes
    process.on('uncaughtException', (err) => {
        console.error('[CRITICAL] Uncaught Exception:', err);
    });
});

// Recover state in background - DO NOT BLOCK server startup
sessionRegistry.recoverStateFromDB().then((count) => {
    console.log(`[Startup] Recovered ${count} active sessions.`);
}).catch(err => {
    console.error('[Startup] Failed to recover state from DB (Non-fatal):', err);
    // Do not exit, allow server to run for diagnostics
});

export { app, httpServer, getWebSocketServer, sessionRegistry };
