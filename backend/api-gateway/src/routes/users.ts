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
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ error: 'User ID required' });
        return;
    }
    try {
        const { data: user, error } = await supabase.auth.admin.getUserById(id);
        if (error) throw error;
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            id: user.user.id,
            email: user.user.email,
            role: (user.user.user_metadata?.['role'] as string) || 'USER',
            created_at: user.user.created_at
        });
    } catch (error) {
        logger.error('Get user error', { error });
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// GET /users/:id/sessions
router.get('/:id/sessions', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data: participants, error } = await supabase
            .from('participants')
            .select('session_id, status, pnl, joined_at')
            .eq('user_id', id)
            .order('joined_at', { ascending: false });

        if (error) throw error;

        res.json({
            user_id: id,
            sessions: participants || []
        });
    } catch (error) {
        logger.error('Get user sessions error', { error });
        res.status(500).json({ error: 'Failed to fetch user sessions' });
    }
});

// GET /users/:id/trades
router.get('/:id/trades', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', id)
            .order('executed_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json({
            user_id: id,
            trades: trades || []
        });
    } catch (error) {
        logger.error('Get user trades error', { error });
        res.status(500).json({ error: 'Failed to fetch user trades' });
    }
});

export default router;
