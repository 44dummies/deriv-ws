/**
 * Users Routes
 * User management endpoints
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /users - Fetch users from Supabase Auth
router.get('/', async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const users = (data?.users || []).map((user) => ({
            id: user.id,
            email: user.email,
            role: (user.user_metadata?.['role'] as string) || 'USER',
            created_at: user.created_at
        }));

        res.json(users);
    } catch (error) {
        logger.error('Users fetch error', { error });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /users/:id
router.get('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    res.json({
        id,
        email: 'placeholder@example.com',
        role: 'user',
        created_at: new Date().toISOString(),
        message: 'Get user - placeholder',
    });
});

// GET /users/:id/sessions
router.get('/:id/sessions', (req: Request, res: Response) => {
    const { id } = req.params;
    res.json({
        user_id: id,
        sessions: [],
        message: 'Get user sessions - placeholder',
    });
});

// GET /users/:id/trades
router.get('/:id/trades', (req: Request, res: Response) => {
    const { id } = req.params;
    res.json({
        user_id: id,
        trades: [],
        message: 'Get user trades - placeholder',
    });
});

export default router;
