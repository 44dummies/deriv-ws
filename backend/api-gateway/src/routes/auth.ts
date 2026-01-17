/**
 * Auth Routes
 * Authentication handlers including Deriv OAuth callback
 * SECURITY: Uses httpOnly cookies for JWT storage
 */

import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateAccountSwitch } from '../middleware/validation.js';
import { DerivWSClient } from '../services/DerivWSClient.js';
import { UserService } from '../services/UserService.js';
import { AuthService } from '../services/AuthService.js';
import { logger } from '../utils/logger.js';

const router = Router();

type DerivAccountPayload = {
    accountId: string;
    token: string;
    currency?: string;
    is_virtual?: boolean;
    fullname?: string;
    email?: string;
};

// Cookie configuration for JWT
// NOTE: sameSite 'none' required for cross-origin (Vercel frontend -> Railway backend)
// SECURITY: Always use secure + sameSite=none in Railway/Vercel deployment (cross-origin)
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PRODUCTION, // Must be true for sameSite: 'none'
    sameSite: (IS_PRODUCTION ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    // Domain omitted to allow cookies to work across subdomains
};

// POST /auth/login
router.post('/login', (_req: Request, res: Response) => {
    res.json({
        message: 'Login endpoint - use /auth/deriv/callback for Deriv OAuth',
        status: 'placeholder',
    });
});

// POST /auth/logout - Clears the session cookie
router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('session', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
});

// GET /auth/session - Check current session status (cookie-based)
// GET /auth/session - Check current session status (cookie-based)
router.get('/session', requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ authenticated: false });
        return;
    }

    let accounts = await UserService.listDerivAccounts(req.user.id);
    const activeAccountId = await UserService.getActiveAccountId(req.user.id);

    // LIVE SYNC: Attempt to fetch fresh balance for active account
    if (activeAccountId) {
        try {
            const token = await UserService.getDerivTokenForAccount(req.user.id, activeAccountId);
            if (token) {
                const client = new DerivWSClient();
                // Short timeout for sync to avoid blocking UI
                await new Promise<void>((resolve, reject) => {
                    const t = setTimeout(() => reject(new Error('Timeout')), 3000);
                    client.once('connected', () => { clearTimeout(t); resolve(); });
                    client.connect();
                });

                const derivData = await client.authorize(token);
                client.disconnect();

                if (derivData) {
                    // Update DB with fresh data
                    await UserService.storeDerivToken({
                        userId: req.user.id,
                        derivToken: token, // Re-encrypt/store (optimized upsert)
                        accountId: activeAccountId,
                        currency: derivData.currency,
                        isVirtual: Boolean(derivData.is_virtual),
                        fullname: derivData.fullname,
                        email: derivData.email,
                        lastBalance: Number(derivData.balance)
                    });

                    // Refresh accounts list after update
                    accounts = await UserService.listDerivAccounts(req.user.id);
                }
            }
        } catch (err) {
            logger.warn('Failed to sync live balance', { userId: req.user.id, error: err instanceof Error ? err.message : 'Unknown' });
            // Fallback to existing DB data (accounts variable)
        }
    }

    // Return user info without sensitive data
    res.json({
        authenticated: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            deriv_accounts: accounts.map((acc) => ({
                loginid: acc.account_id,
                currency: acc.currency || 'USD',
                is_virtual: Boolean(acc.is_virtual),
                balance: Number(acc.last_balance || 0),
                fullname: acc.fullname,
                email: acc.email
            })),
            active_account_id: activeAccountId
        }
    });
});

// POST /auth/deriv/connect
router.post('/deriv/connect', (_req: Request, res: Response) => {
    res.json({
        message: 'Deriv OAuth connect - not implemented',
        status: 'placeholder',
    });
});

/**
 * POST /auth/deriv/callback
 * SECURE Deriv OAuth callback - receives tokens via POST body, never URL
 * Sets httpOnly cookie for session management
 */
router.post('/deriv/callback', async (req: Request, res: Response) => {
    // Support both old format (single token) and new format (multiple accounts)
    const { accounts, primary_account_id, deriv_token, account_id } = req.body;

    // Determine which format was used
    let primaryToken: string;
    let primaryAccountId: string;
    let allAccounts: DerivAccountPayload[] = [];

    if (accounts && Array.isArray(accounts) && accounts.length > 0) {
        // New secure format
        allAccounts = accounts;
        primaryAccountId = primary_account_id || accounts[0].accountId;
        const primaryAcc = accounts.find((a: any) => a.accountId === primaryAccountId) || accounts[0];
        primaryToken = primaryAcc.token;
    } else if (deriv_token && account_id) {
        // Legacy format (single account)
        primaryToken = deriv_token;
        primaryAccountId = account_id;
        allAccounts = [{ accountId: account_id, token: deriv_token }];
    } else {
        res.status(400).json({ error: 'Missing authentication data' });
        return;
    }

    // 1. Verify primary token with Deriv
    const client = new DerivWSClient();
    let authSuccess = false;
    let userEmail: string | undefined;
    let derivAccount: any;

    try {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
            client.once('connected', () => {
                clearTimeout(timeout);
                resolve();
            });
            client.connect();
        });

        derivAccount = await client.authorize(primaryToken);
        authSuccess = !!derivAccount;
        userEmail = derivAccount?.email;

    } catch (error: any) {
        logger.error('Auth token verification connection failed', { error });
        client.disconnect();
        res.status(503).json({ error: 'Deriv connectivity error' });
        return;
    }

    client.disconnect();

    if (!authSuccess) {
        res.status(401).json({ error: 'Invalid Deriv token' });
        return;
    }

    try {
        // 2. Find or Create User
        const user = await UserService.findOrCreateUserFromDeriv(primaryAccountId, userEmail);

        // 3. Store ALL Deriv tokens securely (encrypted in DB)
        for (const acc of allAccounts) {
            const isPrimaryAccount = acc.accountId === primaryAccountId;
            const accountEmail = acc.email || userEmail;
            const accountCurrency = acc.currency || (isPrimaryAccount ? derivAccount?.currency : undefined);
            const accountIsVirtual = acc.is_virtual ?? (isPrimaryAccount ? derivAccount?.is_virtual : undefined);
            const accountFullname = acc.fullname || (isPrimaryAccount ? derivAccount?.fullname : undefined);
            const accountBalance = isPrimaryAccount ? Number(derivAccount?.balance || 0) : undefined;

            await UserService.storeDerivToken({
                userId: user.id,
                derivToken: acc.token,
                accountId: acc.accountId,
                ...(accountCurrency !== undefined ? { currency: accountCurrency } : {}),
                ...(accountIsVirtual !== undefined ? { isVirtual: accountIsVirtual } : {}),
                ...(accountFullname !== undefined ? { fullname: accountFullname } : {}),
                ...(accountEmail !== undefined ? { email: accountEmail } : {}),
                ...(accountBalance !== undefined ? { lastBalance: accountBalance } : {})
            });
        }

        await UserService.setActiveAccountId(user.id, primaryAccountId);

        // 4. Generate Internal Session Token
        const sessionToken = await AuthService.generateSessionToken({
            userId: user.id,
            role: user.role,
            email: user.email
        });

        // 5. Set httpOnly cookie (SECURE - not accessible via JavaScript)
        res.cookie('session', sessionToken, COOKIE_OPTIONS);

        // 6. Return user info (NO tokens in response)
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                fullname: derivAccount?.fullname,
            },
            deriv_account: {
                loginid: primaryAccountId,
                balance: derivAccount?.balance,
                currency: derivAccount?.currency,
                is_virtual: derivAccount?.is_virtual,
                fullname: derivAccount?.fullname
            }
            // NOTE: accessToken intentionally NOT returned - using httpOnly cookie instead
        });

    } catch (error) {
        logger.error('Auth login failed', { error });
        res.status(500).json({ error: 'Failed to process login' });
    }
});

// POST /auth/switch-account - Switch active Deriv account
router.post('/switch-account', requireAuth, validateAccountSwitch, async (req: AuthRequest, res: Response) => {
    const { account_id } = req.body;
    const userId = req.user?.id;

    if (!userId || !account_id) {
        res.status(400).json({ error: 'Missing user or account_id' });
        return;
    }

    try {
        // Verify user has access to this account by checking stored tokens
        const token = await UserService.getDerivTokenForAccount(userId, account_id);

        if (!token) {
            res.status(403).json({ error: 'Account not linked to this user' });
            return;
        }

        await UserService.setActiveAccountId(userId, account_id);

        res.json({ success: true, active_account_id: account_id });

    } catch (error) {
        logger.error('Auth account switch failed', { error });
        res.status(500).json({ error: 'Failed to switch account' });
    }
});

// GET /auth/me - Get current user info
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
});

export default router;
