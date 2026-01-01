/**
 * TraderMind Monitoring & Error Tracking
 * Sentry integration for production error tracking
 */

import { Request, Response, NextFunction } from 'express';

// =============================================================================
// TYPES
// =============================================================================

interface ErrorContext {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    path?: string;
    method?: string;
    source?: string;
    fatal?: boolean;
    extra?: Record<string, any>;
}

interface PerformanceSpan {
    name: string;
    startTime: number;
    endTime?: number;
    tags: Record<string, string>;
}

// =============================================================================
// SENTRY INITIALIZATION (Lazy load to avoid build issues)
// =============================================================================

let Sentry: any = null;
let isInitialized = false;

async function initSentry(): Promise<void> {
    if (isInitialized) return;
    
    const dsn = process.env.SENTRY_DSN;
    
    if (!dsn) {
        console.warn('[Monitoring] SENTRY_DSN not configured. Error tracking disabled.');
        return;
    }
    
    try {
        // Dynamic import to avoid build-time dependency
        // @ts-ignore - Dynamic import, types resolved at runtime
        Sentry = await import('@sentry/node').catch(() => null);
        
        if (!Sentry) {
            console.warn('[Monitoring] @sentry/node not installed. Run: pnpm add @sentry/node');
            return;
        }
        
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',
            release: process.env.APP_VERSION || '1.0.0',
            
            // Performance monitoring
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            
            // Configure which errors to ignore
            ignoreErrors: [
                'OperationCancelledError',
                'AbortError',
                'TimeoutError'
            ],
            
            // Before sending, sanitize sensitive data
            beforeSend(event: any) {
                // Remove sensitive headers
                if (event.request?.headers) {
                    delete event.request.headers.authorization;
                    delete event.request.headers.cookie;
                }
                
                // Remove sensitive body data
                if (event.request?.data) {
                    const sensitiveFields = ['password', 'token', 'deriv_token', 'secret'];
                    for (const field of sensitiveFields) {
                        if (event.request.data[field]) {
                            event.request.data[field] = '[REDACTED]';
                        }
                    }
                }
                
                return event;
            }
        });
        
        isInitialized = true;
        console.log('[Monitoring] Sentry initialized successfully');
        
    } catch (error) {
        console.warn('[Monitoring] Failed to initialize Sentry:', error);
    }
}

// Initialize on module load
initSentry();

// =============================================================================
// ERROR CAPTURE
// =============================================================================

export function captureException(error: Error, context?: ErrorContext): void {
    // Always log to console
    console.error('[Error]', error.message, context);
    
    if (!Sentry || !isInitialized) return;
    
    Sentry.withScope((scope: any) => {
        if (context?.userId) scope.setUser({ id: context.userId });
        if (context?.sessionId) scope.setTag('sessionId', context.sessionId);
        if (context?.requestId) scope.setTag('requestId', context.requestId);
        if (context?.path) scope.setTag('path', context.path);
        if (context?.method) scope.setTag('method', context.method);
        if (context?.extra) scope.setExtras(context.extra);
        
        Sentry.captureException(error);
    });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    console.log(`[${level.toUpperCase()}]`, message);
    
    if (!Sentry || !isInitialized) return;
    
    Sentry.captureMessage(message, level);
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

export function sentryRequestHandler(req: Request, res: Response, next: NextFunction): void {
    if (!Sentry || !isInitialized) {
        return next();
    }
    
    // Use Sentry's request handler if available
    const handler = Sentry.Handlers?.requestHandler?.();
    if (handler) {
        handler(req, res, next);
    } else {
        next();
    }
}

export function sentryErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
    // Capture error with request context
    captureException(err, {
        userId: (req as any).user?.id,
        requestId: (req as any).requestId,
        path: req.path,
        method: req.method,
        extra: {
            query: req.query,
            body: sanitizeBody(req.body)
        }
    });
    
    next(err);
}

function sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'deriv_token', 'secret', 'key'];
    
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    
    return sanitized;
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

const activeSpans: Map<string, PerformanceSpan> = new Map();

export function startSpan(name: string, tags?: Record<string, string>): string {
    const spanId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    activeSpans.set(spanId, {
        name,
        startTime: Date.now(),
        tags: tags ?? {}
    });
    
    return spanId;
}

export function endSpan(spanId: string): void {
    const span = activeSpans.get(spanId);
    if (!span) return;
    
    span.endTime = Date.now();
    const duration = span.endTime - span.startTime;
    
    // Log slow operations
    if (duration > 1000) {
        console.warn(`[Performance] Slow operation: ${span.name} took ${duration}ms`);
    }
    
    // Report to Sentry if available
    if (Sentry && isInitialized && Sentry.startTransaction) {
        const transaction = Sentry.startTransaction({
            name: span.name,
            op: 'custom',
            tags: span.tags
        });
        transaction.finish();
    }
    
    activeSpans.delete(spanId);
}

// =============================================================================
// CUSTOM METRICS
// =============================================================================

interface MetricData {
    name: string;
    value: number;
    timestamp: number;
    tags: Record<string, string>;
}

const metricsBuffer: MetricData[] = [];
const METRICS_FLUSH_INTERVAL = 60000; // 1 minute

export function recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    metricsBuffer.push({
        name,
        value,
        timestamp: Date.now(),
        tags: tags ?? {}
    });
    
    // Keep buffer from growing too large
    if (metricsBuffer.length > 1000) {
        metricsBuffer.shift();
    }
}

export function getMetrics(): MetricData[] {
    return [...metricsBuffer];
}

// Flush metrics periodically
setInterval(() => {
    if (metricsBuffer.length === 0) return;
    
    // In a real implementation, this would send to a metrics service
    console.log(`[Metrics] Flushing ${metricsBuffer.length} metrics`);
    
    // Clear buffer after flush
    metricsBuffer.length = 0;
}, METRICS_FLUSH_INTERVAL);

// =============================================================================
// HEALTH MONITORING
// =============================================================================

interface HealthCheck {
    name: string;
    check: () => Promise<boolean>;
}

const healthChecks: HealthCheck[] = [];

export function registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    healthChecks.push({ name, check });
}

export async function runHealthChecks(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const { name, check } of healthChecks) {
        try {
            results[name] = await check();
        } catch (error) {
            results[name] = false;
            captureException(error as Error, { extra: { healthCheck: name } });
        }
    }
    
    return results;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const monitoring = {
    captureException,
    captureMessage,
    startSpan,
    endSpan,
    recordMetric,
    getMetrics,
    registerHealthCheck,
    runHealthChecks
};

// Class-style export for consistency with index.ts import
export const Monitoring = {
    init: initSentry,
    captureError: captureException,
    captureMessage,
    startSpan,
    endSpan,
    recordMetric,
    getMetrics,
    registerHealthCheck,
    runHealthChecks,
    expressErrorHandler: sentryErrorHandler
};
