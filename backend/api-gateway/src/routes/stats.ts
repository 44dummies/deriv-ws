import { Router, Request, Response } from 'express';
import { signalStore } from '../services/SignalStore.js';
import { sessionRegistry } from '../services/SessionRegistry.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const AI_LAYER_URL = process.env.AI_LAYER_URL || 'http://localhost:8001';

// --- Helper: Get Real-Time Stats ---
async function getSystemStats() {
    const activeSessions = sessionRegistry.getAllSessions();
    const activeSessionCount = activeSessions.length;

    // Calculate real-time active users across all sessions
    const activeParticipants = activeSessions.reduce((acc: number, sess: any) => acc + sess.participants.length, 0);

    // Mock Admin Balance (since Admin doesn't trade)
    // In a real app, this would query the Admin's specific wallet ID
    const adminBalance = {
        real: 15420.50,
        demo: 95400.00,
        currency: 'USD'
    };

    return { activeSessionCount, activeParticipants, adminBalance };
}

// 1. GET /stats/summary
router.get('/summary', async (_req: Request, res: Response) => {
    try {
        const { activeSessionCount, activeParticipants, adminBalance } = await getSystemStats();

        // AI Status Check
        let aiStatus = { status: 'offline', model: 'unknown', latency: 0 };
        const start = Date.now();
        try {
            const aiRes = await fetch(`${AI_LAYER_URL}/model/info`, { signal: AbortSignal.timeout(1000) });
            if (aiRes.ok) {
                const data = await aiRes.json() as any;
                aiStatus = {
                    status: 'online',
                    model: data.model_alias || 'tradermind:latest',
                    latency: Date.now() - start
                };
            }
        } catch (e) { /* ignore offline */ }

        res.json({
            users: {
                active: activeParticipants,
                total: 124, // Ideally fetch `count` from supabase users table
            },
            sessions: {
                active: activeSessionCount,
                total_volume: 45000 // Mock: Volume passing through sessions
            },
            admin_balance: adminBalance,
            ai_health: aiStatus,
            // Add fields expected by Statistics.tsx
            ai: {
                model_version: aiStatus.model,
                insights: [
                    "Market volatility is trending neutral.",
                    "Risk appetite adjusted to 'Conservative'.",
                    "AI detected 94% confidence in recent EURUSD signal."
                ]
            },
            trading: {
                total_profit: adminBalance.real, // Use admin balance as proxy for now
                total_trades: 1240,
                total_signals: 1530,
                win_rate: 68.5
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
        const filter = req.query.filter as string || 'today';

        // Mock Commission Calculation (3% of Volume)
        // In production: Query `trades` table, sum `amount` where `status=won`, * 0.03
        const mockVolume = filter === 'month' ? 1250000 : 45000;
        const commissionRate = 0.03;

        const earnings = {
            total_earned: mockVolume * commissionRate,
            pending_payout: (mockVolume * commissionRate) * 0.8, // 20% unclear mock
            currency: 'USD',
            breakdown: [
                { source: 'Standard Session', amount: (mockVolume * 0.6 * commissionRate) },
                { source: 'VIP Signals', amount: (mockVolume * 0.4 * commissionRate) }
            ]
        };

        res.json(earnings);
    } catch (error) {
        res.status(500).json({ error: 'Commission calc failed' });
    }
});

// 3. GET /stats/logs
router.get('/logs', async (_req: Request, res: Response) => {
    try {
        // Read file based log or use in-memory buffer
        // For now, we return mock logs or use ShadowLogger if it exposed an API
        // Here we mock for premium UI demo
        const logs = [
            { id: 1, timestamp: new Date(Date.now() - 5000).toISOString(), level: 'INFO', message: 'System heartbeat normal.' },
            { id: 2, timestamp: new Date(Date.now() - 15000).toISOString(), level: 'SUCCESS', message: 'Trade #1042 executed on Deriv.' },
            { id: 3, timestamp: new Date(Date.now() - 60000).toISOString(), level: 'WARN', message: 'High latency detected on node-1 (240ms).' },
        ];
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Logs unavailable' });
    }
});

export default router;
