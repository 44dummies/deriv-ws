/**
 * Trades Routes
 * Placeholder handlers for trade operations
 */

import { Router, Request, Response } from 'express';

const router = Router();

// GET /trades
router.get('/', (_req: Request, res: Response) => {
    res.json({
        trades: [],
        total: 0,
        message: 'List trades - placeholder',
    });
});

// POST /trades
router.post('/', (req: Request, res: Response) => {
    const { session_id, type, stake, market } = req.body as {
        session_id?: string;
        type?: string;
        stake?: number;
        market?: string;
    };
    res.status(201).json({
        id: 'trade-placeholder',
        session_id: session_id ?? 'unknown',
        type: type ?? 'CALL',
        stake: stake ?? 10,
        market: market ?? 'R_100',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        message: 'Create trade - placeholder',
    });
});

// GET /trades/:id
router.get('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    res.json({
        id,
        status: 'PENDING',
        profit: 0,
        message: 'Get trade - placeholder',
    });
});

// GET /trades/session/:sessionId
router.get('/session/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    res.json({
        session_id: sessionId,
        trades: [],
        message: 'Get session trades - placeholder',
    });
});

export default router;
