/**
 * TraderMind JWT Authentication Middleware
 * Validates JWT tokens and enforces roles
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthUser {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
}

export interface AuthRequest extends Request {
    user?: AuthUser;
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseKey = process.env['SUPABASE_ANON_KEY'] ?? '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Require authentication
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }

    const token = authHeader.slice(7);

    // Verify JWT with Supabase
    supabase.auth.getUser(token)
        .then(({ data, error }) => {
            if (error || !data.user) {
                res.status(401).json({ error: 'Invalid or expired token' });
                return;
            }

            // Get user role from metadata or database
            req.user = {
                id: data.user.id,
                email: data.user.email ?? '',
                role: (data.user.user_metadata?.['role'] as 'ADMIN' | 'USER') ?? 'USER',
            };

            next();
        })
        .catch(() => {
            res.status(401).json({ error: 'Authentication failed' });
        });
}

/**
 * Require ADMIN role
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    if (req.user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    next();
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        next();
        return;
    }

    const token = authHeader.slice(7);

    supabase.auth.getUser(token)
        .then(({ data }) => {
            if (data.user) {
                req.user = {
                    id: data.user.id,
                    email: data.user.email ?? '',
                    role: (data.user.user_metadata?.['role'] as 'ADMIN' | 'USER') ?? 'USER',
                };
            }
            next();
        })
        .catch(() => {
            next();
        });
}
