import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sessionRegistry } from '../services/SessionRegistry.js';

const router = Router();
const AI_LAYER_URL = process.env.AI_LAYER_URL || 'http://localhost:8001';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Helper: Get Real Real-Time Stats from DB ---
async function getRealStats() {
    const activeSessions = sessionRegistry.getAllSessions();
    const activeParticipants = activeSessions.reduce((acc: number, sess: any) => acc + sess.participants.length, 0);

    // 1. Total Users
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });

    // 2. Trading Stats (Aggregate)
    // Assuming 'trades' table exists with 'pnl' and 'status'
    const { data: trades } = await supabase
        .from('trades')
        .select('pnl, status');

    let totalProfit = 0;
    let winCount = 0;
    let totalTrades = 0;

    if (trades) {
        totalTrades = trades.length;
        trades.forEach(t => {
            if (t.pnl) totalProfit += Number(t.pnl);
            if (t.pnl > 0 || t.status === 'WON') winCount++;
        });
    }

    const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(1) : 0;

    // 3. Signals Count
    const { count: totalSignals } = await supabase.from('signals').select('*', { count: 'exact', head: true });

    // 4. Admin Wallet (Mock -> Query specific wallet if available, else 0)
    // For now we return 0 if we can't query actual wallet to adhere to "No Mock Data"
    // Or we keep it as "System Equity" calculated from total profit
    const adminBalance = {
        real: totalProfit, // Real profit from DB
        demo: 0,
        currency: 'USD'
    };

    return {
        activeSessionCount: activeSessions.length,
        activeParticipants,
        totalUsers: totalUsers || 0,
        totalTrades,
        totalProfit,
        winRate,
        totalSignals: totalSignals || 0,
        adminBalance
    };
}

// 1. GET /stats/summary
router.get('/summary', async (_req: Request, res: Response) => {
    try {
        const stats = await getRealStats();

        // AI Status Check
        let aiStatus = { status: 'offline', model: 'unknown', latency: 0 };
        const start = Date.now();
        try {
            const aiRes = await fetch(`${AI_LAYER_URL}/model/info`, { signal: AbortSignal.timeout(1000) });
            if (aiRes.ok) {
                const data = await aiRes.json() as any;
                aiStatus = {
                    status: 'online',
                    model: data.model_alias || 'EMJ',
                    latency: Date.now() - start
                };
            }
        } catch (e) { /* ignore offline */ }

        res.json({
            users: {
                active: stats.activeParticipants,
                total: stats.totalUsers,
            },
            sessions: {
                active: stats.activeSessionCount,
                total_volume: stats.totalTrades // Volume = number of trades for now
            },
            admin_balance: stats.adminBalance,
            ai_health: aiStatus,
            ai: {
                model_version: aiStatus.model,
                insights: [] // No trade history analysis yet
            },
            trading: {
                total_profit: stats.totalProfit,
                total_trades: stats.totalTrades,
                total_signals: stats.totalSignals,
                win_rate: Number(stats.winRate)
            },
            system_time: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Stats] Summary Error:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// 2. GET /stats/commissions
router.get('/commissions', async (req: Request, res: Response) => {
    try {
        // Real logic: 3% of positive PnL from trades
        const { data: wonTrades } = await supabase
            .from('trades')
            .select('pnl')
            .gt('pnl', 0);

        let totalVolume = 0;
        if (wonTrades) {
            totalVolume = wonTrades.reduce((acc, t) => acc + Number(t.pnl), 0);
        }

        const commissionRate = 0.03;
        const totalEarned = totalVolume * commissionRate;

        res.json({
            total_earned: totalEarned,
            pending_payout: totalEarned, // Simple 100% available for now
            currency: 'USD',
            breakdown: []
        });
    } catch (error) {
        res.status(500).json({ error: 'Commission calc failed' });
    }
});

// 3. GET /stats/logs
router.get('/logs', async (_req: Request, res: Response) => {
    // Return empty if no real logs DB yet, or implement log query if available
    res.json([]);
});

export default router;
