import { Router, Request, Response } from 'express';
import { signalStore } from '../services/SignalStore.js';

const router = Router();
const AI_LAYER_URL = process.env.AI_LAYER_URL || 'http://localhost:8001';

router.get('/', async (_req: Request, res: Response) => {
    try {
        // 1. Get Trading Stats from SignalStore (In-Memory)
        const tradingStats = signalStore.getStats();

        // 2. Get AI Model Info from AI Layer
        let aiInfo = { model_version: 'unknown', status: 'offline' };
        try {
            const aiResponse = await fetch(`${AI_LAYER_URL}/model/info`, { signal: AbortSignal.timeout(2000) });
            if (aiResponse.ok) {
                aiInfo = await aiResponse.json() as { model_version: string; status: string };
            }
        } catch (error) {
            console.warn('[Stats] Failed to fetch AI model info:', error);
        }

        // 3. Construct Aggregate Response
        const response = {
            trading: {
                total_signals: tradingStats.totalSignals,
                active_sessions: tradingStats.activeSessions,
                // Mocking financial data since SignalStore doesn't track P&L yet
                total_profit: 1240.50, // Placeholder
                win_rate: 68.4,        // Placeholder
                total_trades: 1204     // Placeholder
            },
            ai: {
                ...aiInfo,
                insights: [
                    "Market volatility is trending upwards.",
                    "Recommended strategy: Conservative Scalping."
                ]
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);

    } catch (error) {
        console.error('[Stats] Error generating stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
