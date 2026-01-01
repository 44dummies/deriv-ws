/**
 * TraderMind Rate Limiter Middleware
 * Protects API from abuse and DDoS attacks
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
    message: string;       // Error message when limit exceeded
    keyPrefix: string;     // Redis key prefix
}

const DEFAULT_CONFIG: RateLimitConfig = {
    windowMs: 60 * 1000,           // 1 minute
    maxRequests: 100,              // 100 requests per minute
    message: 'Too many requests, please try again later.',
    keyPrefix: 'tradermind:ratelimit:'
};

// Stricter limits for auth endpoints
const AUTH_CONFIG: RateLimitConfig = {
    windowMs: 15 * 60 * 1000,      // 15 minutes
    maxRequests: 10,               // 10 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    keyPrefix: 'tradermind:ratelimit:auth:'
};

// =============================================================================
// REDIS CLIENT
// =============================================================================

let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (!redis && process.env.REDIS_URL) {
        try {
            redis = new Redis(process.env.REDIS_URL);
            redis.on('error', (err) => {
                console.error('[RateLimiter] Redis error:', err);
            });
        } catch (err) {
            console.warn('[RateLimiter] Redis connection failed, using in-memory fallback');
        }
    }
    return redis;
}

// In-memory fallback when Redis is unavailable
const memoryStore: Map<string, { count: number; resetTime: number }> = new Map();

// =============================================================================
// RATE LIMITER FACTORY
// =============================================================================

function createRateLimiter(config: RateLimitConfig = DEFAULT_CONFIG) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Get client identifier (IP or user ID if authenticated)
        const clientId = getClientId(req);
        const key = `${config.keyPrefix}${clientId}`;
        
        try {
            const redisClient = getRedis();
            
            if (redisClient) {
                // Redis-based rate limiting
                const result = await checkRedisLimit(redisClient, key, config);
                
                if (!result.allowed) {
                    res.status(429).json({
                        error: config.message,
                        retryAfter: Math.ceil(result.retryAfter / 1000)
                    });
                    return;
                }
                
                // Add rate limit headers
                res.setHeader('X-RateLimit-Limit', config.maxRequests);
                res.setHeader('X-RateLimit-Remaining', result.remaining);
                res.setHeader('X-RateLimit-Reset', result.resetTime);
                
            } else {
                // In-memory fallback
                const result = checkMemoryLimit(key, config);
                
                if (!result.allowed) {
                    res.status(429).json({
                        error: config.message,
                        retryAfter: Math.ceil(result.retryAfter / 1000)
                    });
                    return;
                }
            }
            
            next();
        } catch (err) {
            console.error('[RateLimiter] Error:', err);
            // Fail open - allow request if rate limiter fails
            next();
        }
    };
}

// =============================================================================
// HELPERS
// =============================================================================

function getClientId(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).user?.id;
    if (userId) return `user:${userId}`;
    
    // Get real IP from proxy headers or socket
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const ip = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor?.split(',')[0]?.trim() 
        ?? realIp 
        ?? req.socket.remoteAddress 
        ?? 'unknown';
    
    return `ip:${ip}`;
}

async function checkRedisLimit(
    redis: Redis, 
    key: string, 
    config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter: number }> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Use Redis sorted set for sliding window
    const pipeline = redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Count requests in window
    pipeline.zcard(key);
    
    // Set expiry
    pipeline.pexpire(key, config.windowMs);
    
    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number ?? 0;
    
    const resetTime = Math.ceil((now + config.windowMs) / 1000);
    const remaining = Math.max(0, config.maxRequests - count);
    const allowed = count <= config.maxRequests;
    const retryAfter = allowed ? 0 : config.windowMs;
    
    return { allowed, remaining, resetTime, retryAfter };
}

function checkMemoryLimit(
    key: string, 
    config: RateLimitConfig
): { allowed: boolean; remaining: number; retryAfter: number } {
    const now = Date.now();
    const entry = memoryStore.get(key);
    
    if (!entry || now > entry.resetTime) {
        // New window
        memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
        return { allowed: true, remaining: config.maxRequests - 1, retryAfter: 0 };
    }
    
    entry.count++;
    
    if (entry.count > config.maxRequests) {
        return { 
            allowed: false, 
            remaining: 0, 
            retryAfter: entry.resetTime - now 
        };
    }
    
    return { 
        allowed: true, 
        remaining: config.maxRequests - entry.count, 
        retryAfter: 0 
    };
}

// Clean up memory store periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
        if (now > entry.resetTime) {
            memoryStore.delete(key);
        }
    }
}, 60000); // Every minute

// =============================================================================
// EXPORTS
// =============================================================================

export const rateLimiter = createRateLimiter(DEFAULT_CONFIG);
export const authRateLimiter = createRateLimiter(AUTH_CONFIG);
export { createRateLimiter };
export type { RateLimitConfig };
