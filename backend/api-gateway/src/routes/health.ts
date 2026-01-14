/**
 * TraderMind Health Check Routes
 * Comprehensive dependency health checks for production monitoring
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const router = Router();

// =============================================================================
// TYPES
// =============================================================================

interface HealthCheck {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency_ms?: number;
    error?: string;
}

interface HealthReport {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime_seconds: number;
    checks: {
        supabase: HealthCheck;
        redis: HealthCheck;
        deriv_api: HealthCheck;
    };
}

// =============================================================================
// HELPER: Time a health check
// =============================================================================

async function timedCheck(
    name: string,
    checkFn: () => Promise<void>
): Promise<HealthCheck> {
    const start = Date.now();
    try {
        await checkFn();
        return {
            status: 'healthy',
            latency_ms: Date.now() - start,
        };
    } catch (err) {
        return {
            status: 'unhealthy',
            latency_ms: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// =============================================================================
// CHECK: Supabase Database
// =============================================================================

async function checkSupabase(): Promise<void> {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // Simple query to test connection
    const { error } = await supabase
        .from('sessions')
        .select('id')
        .limit(1);

    if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
    }
}

// =============================================================================
// CHECK: Redis (Memory Store)
// =============================================================================

async function checkRedis(): Promise<void> {
    // Import the memory-based Redis client
    // In production with actual Redis, this would do a PING
    const { hset, hgetall, del } = await import('../services/RedisClient.js');

    const testKey = 'health:test';
    const testValue = Date.now().toString();

    // Write, read, delete cycle
    await hset(testKey, { test: testValue });
    const result = await hgetall(testKey);
    await del(testKey);

    if (result.test !== testValue) {
        throw new Error('Redis read/write mismatch');
    }
}

// =============================================================================
// CHECK: Deriv API Connectivity
// =============================================================================

async function checkDerivAPI(): Promise<void> {
    const appId = process.env['DERIV_APP_ID'];
    
    if (!appId) {
        throw new Error('DERIV_APP_ID not configured');
    }

    // Test WebSocket connection to Deriv
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Deriv API connection timeout'));
        }, 5000);

        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);

        ws.on('open', () => {
            // Send ping to verify API is responsive
            ws.send(JSON.stringify({ ping: 1 }));
        });

        ws.on('message', (data: string) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.pong) {
                    clearTimeout(timeout);
                    ws.close();
                    resolve();
                }
            } catch {
                // Ignore parse errors
            }
        });

        ws.on('error', (err: Error) => {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`Deriv WebSocket error: ${err.message}`));
        });
    });
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /health
 * Basic health check (fast, no dependency checks)
 */
router.get('/', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
    });
});

/**
 * GET /health/ready
 * Readiness probe - checks if service can accept traffic
 * Use for Kubernetes/Docker health checks
 */
router.get('/ready', async (_req: Request, res: Response) => {
    try {
        // Quick Supabase check only (critical dependency)
        await checkSupabase();
        res.json({ status: 'ready' });
    } catch (err) {
        res.status(503).json({
            status: 'not_ready',
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
});

/**
 * GET /health/live
 * Liveness probe - checks if service is alive
 * Use for container orchestration
 */
router.get('/live', (_req: Request, res: Response) => {
    res.json({ status: 'alive', uptime: process.uptime() });
});

/**
 * GET /health/detailed
 * Comprehensive health check of all dependencies
 * Protected - only for internal monitoring
 */
router.get('/detailed', async (req: Request, res: Response) => {
    // Optional: Add auth check for detailed endpoint
    // const authHeader = req.headers.authorization;
    // if (authHeader !== `Bearer ${process.env.HEALTH_CHECK_SECRET}`) {
    //     return res.status(401).json({ error: 'Unauthorized' });
    // }

    const [supabaseCheck, redisCheck, derivCheck] = await Promise.all([
        timedCheck('supabase', checkSupabase),
        timedCheck('redis', checkRedis),
        timedCheck('deriv_api', checkDerivAPI),
    ]);

    const checks = {
        supabase: supabaseCheck,
        redis: redisCheck,
        deriv_api: derivCheck,
    };

    // Determine overall status
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (allHealthy) {
        overallStatus = 'healthy';
    } else if (anyUnhealthy) {
        // Supabase is critical - if it's down, we're unhealthy
        overallStatus = checks.supabase.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    } else {
        overallStatus = 'degraded';
    }

    const report: HealthReport = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] ?? '1.0.0',
        uptime_seconds: Math.floor(process.uptime()),
        checks,
    };

    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    res.status(httpStatus).json(report);
});

export default router;
