/**
 * TraderMind Request/Response Logger Middleware
 * Comprehensive logging for monitoring and debugging
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface LogEntry {
    requestId: string;
    timestamp: string;
    method: string;
    path: string;
    statusCode?: number;
    duration?: number;
    userId?: string;
    userAgent?: string;
    ip?: string;
    contentLength?: number;
    error?: string;
}

// Paths to exclude from logging (health checks, etc.)
const EXCLUDED_PATHS = ['/health', '/api/v1/status', '/'];

// Paths with sensitive data that should be masked
const SENSITIVE_PATHS = ['/auth', '/login', '/callback'];

// =============================================================================
// LOGGER MIDDLEWARE
// =============================================================================

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    // Skip excluded paths
    if (EXCLUDED_PATHS.includes(req.path)) {
        return next();
    }

    // Generate unique request ID
    const requestId = randomUUID();
    (req as any).requestId = requestId;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    const startTime = Date.now();
    
    // Get client info
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const userId = (req as any).user?.id;
    
    // Log request
    const logEntry: LogEntry = {
        requestId,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        userId,
        userAgent: userAgent.substring(0, 100), // Truncate long user agents
        ip
    };
    
    // Log request body for non-sensitive paths (debug level)
    if (process.env.LOG_LEVEL === 'debug' && !isSensitivePath(req.path)) {
        process.stdout.write(`[Request] ${JSON.stringify(logEntry)}\n`);
        if (req.body && Object.keys(req.body).length > 0) {
            process.stdout.write(`[Request Body] ${requestId}: ${JSON.stringify(maskSensitiveData(req.body))}\n`);
        }
    }
    
    // Capture response
    const originalSend = res.send;
    res.send = function(body): Response {
        const duration = Date.now() - startTime;
        
        // Complete log entry
        logEntry.statusCode = res.statusCode;
        logEntry.duration = duration;
        logEntry.contentLength = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body ?? '');
        
        // Log based on status code
        if (res.statusCode >= 500) {
            process.stderr.write(`[Response ERROR] ${JSON.stringify(logEntry)}\n`);
        } else if (res.statusCode >= 400) {
            process.stderr.write(`[Response WARN] ${JSON.stringify(logEntry)}\n`);
        } else {
            process.stdout.write(`[Response] ${req.method} ${req.path} ${res.statusCode} ${duration}ms\n`);
        }
        
        // Call original send
        return originalSend.call(this, body);
    };
    
    next();
}

// =============================================================================
// ERROR LOGGER
// =============================================================================

export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction): void {
    const requestId = (req as any).requestId ?? 'unknown';
    
    process.stderr.write(`[Error] ${requestId}: ${JSON.stringify({
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id
    })}\n`);
    
    next(err);
}

// =============================================================================
// HELPERS
// =============================================================================

function getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    
    if (Array.isArray(forwardedFor)) {
        return forwardedFor[0] ?? 'unknown';
    }
    
    return forwardedFor?.split(',')[0]?.trim() 
        ?? (realIp as string) 
        ?? req.socket.remoteAddress 
        ?? 'unknown';
}

function isSensitivePath(path: string): boolean {
    return SENSITIVE_PATHS.some(p => path.includes(p));
}

function maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const masked = { ...data };
    const sensitiveKeys = ['password', 'token', 'deriv_token', 'secret', 'key', 'authorization'];
    
    for (const key of Object.keys(masked)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            masked[key] = '***MASKED***';
        } else if (typeof masked[key] === 'object') {
            masked[key] = maskSensitiveData(masked[key]);
        }
    }
    
    return masked;
}

// =============================================================================
// AUDIT LOGGER (For sensitive operations)
// =============================================================================

export function auditLog(action: string, details: Record<string, any>): void {
    const entry = {
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        action,
        ...details
    };
    
    // In production, this would go to a separate audit log stream
    process.stdout.write(`[AUDIT] ${JSON.stringify(entry)}\n`);
}
