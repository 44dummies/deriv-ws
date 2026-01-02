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
import executeRoutes from './routes/execute.js';
import statsRoutes from './routes/stats.js';
import chatRoutes from './routes/chat.js';
import docsRoutes from './routes/docs.js';

// Middleware imports
import { rateLimiter, authRateLimiter } from './middleware/rateLimiter.js';
import { requestLogger, errorLogger } from './middleware/logger.js';
import { csrfProtection, getCsrfToken } from './middleware/csrf.js';

// Services
import { initWebSocketServer, getWebSocketServer } from './services/WebSocketServer.js';
import { sessionRegistry } from './services/SessionRegistry.js';
import { Monitoring } from './services/Monitoring.js';
import './services/ShadowLogger.js'; // Initialize Shadow Logger

// =============================================================================
// INITIALIZE MONITORING (must be first)
// =============================================================================
Monitoring.init();
console.log('[Startup] Sentry monitoring initialized');

// =============================================================================
// CONFIG VALIDATION (Zero-Trust)
// =============================================================================
const REQUIRED_ENV = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error('[Startup] FATAL: Missing required environment variables:', missingEnv);
    process.exit(1); // Fail fast in production
}

// Warn about optional but important env vars
if (!process.env.DERIV_TOKEN_KEY) {
    console.warn('[Startup] WARNING: DERIV_TOKEN_KEY not set. Token encryption will fail until configured.');
}

// NOTE: AI Layer has been removed - pure quantitative trading engine active

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket Server
const wsServer = initWebSocketServer(httpServer);

// =============================================================================
// CORS CONFIGURATION (Explicit, no wildcards in production)
// =============================================================================
const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

if (process.env.NODE_ENV === 'production' && (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*')) {
    console.error('[Startup] FATAL: CORS_ORIGIN must be explicitly set in production (not *)');
    process.exit(1);
}

// =============================================================================
// MIDDLEWARE STACK
// =============================================================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", ...allowedOrigins],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for WebSocket
}));

// CORS with explicit origins
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Cookie parsing middleware
app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie;
    (req as any).cookies = {};
    if (cookieHeader) {
        cookieHeader.split(";").forEach((cookie) => {
            const [name, ...rest] = cookie.split("=");
            if (name) {
                (req as any).cookies[name.trim()] = rest.join("=").trim();
            }
        });
    }
    next();
});

// Request logging
app.use(requestLogger);

// Global rate limiter
app.use(rateLimiter);

// CSRF protection (after cookie parser)
app.use(csrfProtection);

// CSRF token endpoint
app.get('/api/v1/csrf-token', getCsrfToken);

// =============================================================================
// API ROUTES
// =============================================================================

// Auth routes with stricter rate limiting
app.use('/api/v1/auth', authRateLimiter, authRoutes);
app.use('/api/v1/sessions', sessionsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/trades', tradesRoutes);
app.use('/api/v1/trades', executeRoutes); // Manual trade execution
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/docs', docsRoutes); // OpenAPI/Swagger documentation

// Legacy routes (without /api/v1 prefix for backward compatibility)
app.use('/auth', authRateLimiter, authRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/users', usersRoutes);
app.use('/trades', tradesRoutes);
app.use('/stats', statsRoutes);

// API status
app.get('/api/v1/status', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check endpoint (no rate limiting)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
});

// Root healthcheck for deployment platforms (Railway/Render)
app.get('/', (_req, res) => {
    res.status(200).send('TraderMind API Gateway is running');
});

// WebSocket stats endpoint
app.get('/api/v1/ws/stats', (_req, res) => {
    const stats = wsServer.getStats();
    res.json(stats);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Error logger (must be before error handler)
app.use(errorLogger);

// Sentry error handler (captures errors to Sentry)
app.use(Monitoring.expressErrorHandler);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Capture to Sentry
    Monitoring.captureError(err, { source: 'express-error-handler' });
    
    console.error('Unhandled error:', err);
    
    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        res.status(403).json({ error: 'CORS policy violation' });
        return;
    }
    
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

    // Log uncaught exceptions to Sentry and prevent silent crashes
    process.on('uncaughtException', (err) => {
        console.error('[CRITICAL] Uncaught Exception:', err);
        Monitoring.captureError(err, { source: 'uncaught-exception', fatal: true });
    });

    process.on('unhandledRejection', (reason) => {
        console.error('[CRITICAL] Unhandled Promise Rejection:', reason);
        Monitoring.captureError(reason instanceof Error ? reason : new Error(String(reason)), {
            source: 'unhandled-rejection'
        });
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
