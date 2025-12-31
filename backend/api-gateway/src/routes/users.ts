/**
 * Users Routes
 * User management endpoints
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /users - Fetch real users from database
router.get('/', async (_req: Request, res: Response) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, role, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json(users || []);
    } catch (error) {
        console.error('[Users] Fetch error:', error);
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
