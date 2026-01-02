/**
 * Trades Routes
 * Real trade operations with Supabase integration
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Initialize Supabase Client
const getSupabase = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
    }
    return createClient(supabaseUrl, supabaseKey);
};

// GET /trades - List all trades for current user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { limit = 50, offset = 0, session_id } = req.query;

        let query = getSupabase()
            .from('trades')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        // Filter by user if not admin
        if (req.user?.role !== 'ADMIN') {
            query = query.eq('user_id', userId);
        }

        // Filter by session if provided
        if (session_id) {
            query = query.eq('session_id', session_id);
        }

        const { data: trades, count, error } = await query;

        if (error) {
            console.error('[Trades] List error:', error);
            res.status(500).json({ error: 'Failed to fetch trades' });
            return;
        }

        res.json({
            trades: trades || [],
            total: count || 0,
            limit: Number(limit),
            offset: Number(offset)
        });
    } catch (error) {
        console.error('[Trades] List error:', error);
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});

// GET /trades/:id - Get specific trade
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        let query = getSupabase()
            .from('trades')
            .select('*')
            .eq('id', id)
            .single();

        // Only allow user to see their own trades unless admin
        if (req.user?.role !== 'ADMIN') {
            query = query.eq('user_id', userId);
        }

        const { data: trade, error } = await query;

        if (error || !trade) {
            res.status(404).json({ error: 'Trade not found' });
            return;
        }

        res.json(trade);
    } catch (error) {
        console.error('[Trades] Get error:', error);
        res.status(500).json({ error: 'Failed to fetch trade' });
    }
});

// GET /trades/session/:sessionId - Get all trades for a session
router.get('/session/:sessionId', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { sessionId } = req.params;

        const { data: trades, error } = await getSupabase()
            .from('trades')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Trades] Session trades error:', error);
            res.status(500).json({ error: 'Failed to fetch session trades' });
            return;
        }

        res.json({
            session_id: sessionId,
            trades: trades || [],
            total: trades?.length || 0
        });
    } catch (error) {
        console.error('[Trades] Session trades error:', error);
        res.status(500).json({ error: 'Failed to fetch session trades' });
    }
});

// GET /trades/stats/summary - Get trade statistics
router.get('/stats/summary', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';

        let query = getSupabase().from('trades').select('pnl, status, created_at');
        
        if (!isAdmin) {
            query = query.eq('user_id', userId);
        }

        const { data: trades, error } = await query;

        if (error) {
            res.status(500).json({ error: 'Failed to fetch trade stats' });
            return;
        }

        const stats = {
            total_trades: trades?.length || 0,
            total_profit: 0,
            total_loss: 0,
            win_count: 0,
            loss_count: 0,
            win_rate: 0
        };

        if (trades) {
            trades.forEach(t => {
                const pnl = Number(t.pnl) || 0;
                if (pnl > 0) {
                    stats.total_profit += pnl;
                    stats.win_count++;
                } else if (pnl < 0) {
                    stats.total_loss += Math.abs(pnl);
                    stats.loss_count++;
                }
            });

            if (stats.total_trades > 0) {
                stats.win_rate = (stats.win_count / stats.total_trades) * 100;
            }
        }

        res.json(stats);
    } catch (error) {
        console.error('[Trades] Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch trade stats' });
    }
});

export default router;
