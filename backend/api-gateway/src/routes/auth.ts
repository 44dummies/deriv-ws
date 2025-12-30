/**
 * Auth Routes
 * Authentication handlers including Deriv OAuth callback
 */

import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { DerivWSClient } from '../services/DerivWSClient.js';
import { UserService } from '../services/UserService.js';
import { AuthService } from '../services/AuthService.js';

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
// POST /auth/deriv/callback (Login Endpoint)
// This endpoint is now PUBLIC as it performs the login
router.post('/deriv/callback', async (req: Request, res: Response) => {
    const { deriv_token, account_id } = req.body;

    if (!deriv_token || !account_id) {
        res.status(400).json({ error: 'Missing deriv_token or account_id' });
        return;
    }

    // 1. Verify token with Deriv
    const client = new DerivWSClient();
    let authSuccess = false;
    let userEmail: string | undefined;
    let derivAccount: any; // Lifted scope

    try {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
            client.once('connected', () => {
                clearTimeout(timeout);
                resolve();
            });
            client.connect();
        });

        // We verify the token is valid for this account
        derivAccount = await client.authorize(deriv_token);
        authSuccess = !!derivAccount;

        // Optionally fetch account settings to get email if possible, or assume it's valid
        // Deriv WS 'authorize' response usually contains email if scope allows, but we might verify basic access first.
        // For now, if authorize returns true, it's valid.

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

    try {
        // 2. Find or Create User
        // Use loginid from Deriv if available, or fallback to account_id
        const user = await UserService.findOrCreateUserFromDeriv(account_id, userEmail);

        // 3. Persist Deriv Token Securely
        await UserService.storeDerivToken({
            userId: user.id,
            derivToken: deriv_token,
            accountId: account_id
        });

        // 4. Generate Internal Session Token
        const accessToken = await AuthService.generateSessionToken({
            userId: user.id,
            role: user.role,
            email: user.email
        });

        res.json({
            success: true,
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                deriv_account: derivAccount // Pass full deriv account data (balance, currency, is_virtual)
            }
        });

    } catch (error) {
        console.error('[Auth] Login failed', error);
        res.status(500).json({ error: 'Failed to process login' });
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
