/**
 * TraderMind CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHmac } from 'crypto';
import { logger } from '../utils/logger.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf_token';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Safe methods that don't need CSRF protection
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Paths that are exempt from CSRF (webhooks, OAuth callbacks)
const EXEMPT_PATHS = [
    '/api/v1/auth/deriv/callback',
    '/webhook',
    '/health'
];

// =============================================================================
// TOKEN GENERATION
// =============================================================================

function generateToken(): string {
    return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

function signToken(token: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(token);
    return hmac.digest('hex');
}

function verifyTokenSignature(token: string, signature: string, secret: string): boolean {
    const expectedSignature = signToken(token, secret);
    
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
        return false;
    }
    
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
        result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    return result === 0;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
    const secret = process.env.SESSION_SECRET;
    
    if (!secret) {
        logger.error('CSRF SESSION_SECRET not configured, CSRF protection disabled');
        return next();
    }
    
    // Skip CSRF for safe methods
    if (SAFE_METHODS.includes(req.method)) {
        // Generate and send a new token on GET requests
        ensureCsrfToken(res, secret);
        return next();
    }
    
    // Skip CSRF for exempt paths
    if (EXEMPT_PATHS.some(path => req.path.startsWith(path))) {
        return next();
    }
    
    // For state-changing methods, verify the token
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;
    const cookieToken = (req as any).cookies?.[CSRF_COOKIE_NAME];
    
    // If no cookie set, reject but set token for next time
    if (!cookieToken) {
        ensureCsrfToken(res, secret);
        res.status(403).json({ 
            error: 'CSRF token missing',
            message: 'Please fetch a CSRF token and retry'
        });
        return;
    }
    
    // Verify header token matches signed cookie
    if (!headerToken) {
        ensureCsrfToken(res, secret);
        res.status(403).json({ 
            error: 'CSRF token missing',
            message: 'Please include X-CSRF-Token header'
        });
        return;
    }
    
    // Parse cookie token (format: token:signature)
    const [token, signature] = cookieToken.split(':');
    
    if (!token || !signature) {
        ensureCsrfToken(res, secret);
        res.status(403).json({ error: 'Invalid CSRF cookie format' });
        return;
    }
    
    // Verify signature
    if (!verifyTokenSignature(token, signature, secret)) {
        ensureCsrfToken(res, secret);
        res.status(403).json({ error: 'Invalid CSRF token signature' });
        return;
    }
    
    // Verify header matches token
    if (headerToken !== token) {
        ensureCsrfToken(res, secret);
        res.status(403).json({ error: 'CSRF token mismatch' });
        return;
    }
    
    // Token is valid, proceed
    next();
}

function ensureCsrfToken(res: Response, secret: string): void {
    const token = generateToken();
    const signature = signToken(token, secret);
    const cookieValue = `${token}:${signature}`;
    
    const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
    
    // Set cookie with security flags
    // SECURITY: Use 'lax' instead of 'strict' to allow cross-origin preflight (Vercel → Railway)
    res.cookie(CSRF_COOKIE_NAME, cookieValue, {
        httpOnly: false, // Must be readable by JavaScript to include in header
        secure: IS_PRODUCTION,
        sameSite: IS_PRODUCTION ? 'none' : 'lax', // 'none' required for cross-origin
        maxAge: TOKEN_EXPIRY_MS,
        path: '/'
    });
    
    // Also expose token in response header for easy access
    res.setHeader('X-CSRF-Token', token);
}

// =============================================================================
// TOKEN ENDPOINT
// =============================================================================

export function getCsrfToken(req: Request, res: Response): void {
    const secret = process.env.SESSION_SECRET;
    
    if (!secret) {
        res.status(500).json({ error: 'CSRF not configured' });
        return;
    }
    
    const token = generateToken();
    const signature = signToken(token, secret);
    const cookieValue = `${token}:${signature}`;
    
    const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
    
    res.cookie(CSRF_COOKIE_NAME, cookieValue, {
        httpOnly: false,
        secure: IS_PRODUCTION,
        sameSite: IS_PRODUCTION ? 'none' : 'lax', // 'none' required for cross-origin
        maxAge: TOKEN_EXPIRY_MS,
        path: '/'
    });
    
    res.json({ csrfToken: token });
}
