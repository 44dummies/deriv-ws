/**
 * Auth Routes
 * Authentication handlers including Deriv OAuth callback
 */

import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { DerivWSClient } from '../services/DerivWSClient.js';
import { UserService } from '../services/UserService.js';

const router = Router();

// POST /auth/login
router.post('/login', (_req: Request, res: Response) => {
    res.json({
        message: 'Login endpoint - not implemented',
        status: 'placeholder',
    });
});

// POST /auth/logout
router.post('/logout', (_req: Request, res: Response) => {
    res.json({
        message: 'Logout endpoint - not implemented',
        status: 'placeholder',
    });
});

// POST /auth/deriv/connect
router.post('/deriv/connect', (_req: Request, res: Response) => {
    res.json({
        message: 'Deriv OAuth connect - not implemented',
        status: 'placeholder',
    });
});

// POST /auth/deriv/callback (Strict Implementation)
router.post('/deriv/callback', requireAuth, async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
    }

    const { deriv_token, account_id } = req.body;

    if (!deriv_token || !account_id) {
        res.status(400).json({ error: 'Missing deriv_token or account_id' });
        return;
    }

    // 1. Verify token with Deriv
    const client = new DerivWSClient();
    let authSuccess = false;

    try {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
            client.once('connected', () => {
                clearTimeout(timeout);
                resolve();
            });
            client.connect();
        });

        authSuccess = await client.authorize(deriv_token);

    } catch (error: any) {
        console.error('[Auth] Token verification connection failed', error);
        client.disconnect();
        res.status(503).json({ error: 'Deriv connectivity error' });
        return;
    }

    // Always disconnect the temporary verification client
    client.disconnect();

    if (!authSuccess) {
        res.status(401).json({ error: 'Invalid Deriv token' });
        return;
    }

    // 2. Persist token securely
    try {
        await UserService.storeDerivToken({
            userId: user.id,
            derivToken: deriv_token,
            accountId: account_id
        });

        res.json({ success: true, account_id });
    } catch (error) {
        console.error('[Auth] Storage failed', error);
        res.status(500).json({ error: 'Failed to store token' });
    }
});

// GET /auth/me
router.get('/me', (_req: Request, res: Response) => {
    res.json({
        message: 'Get current user - not implemented',
        status: 'placeholder',
    });
});

export default router;
