/**
 * Manual Trade Execution Endpoint
 * Allows users to execute trades directly (not just via AI)
 */

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateTradeExecution } from '../middleware/validation.js';
import { tradeRateLimiter } from '../middleware/rateLimiter.js';
import { createClient } from '@supabase/supabase-js';
import { DerivWSClient } from '../services/DerivWSClient.js';
import { riskGuard } from '../services/RiskGuard.js';
import { UserService } from '../services/UserService.js';
import crypto from 'crypto';
import { executionCore } from '../services/ExecutionCore.js';
import { quantEngine } from '../services/QuantEngine.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ... (existing imports)

interface ManualTradeRequest {
    market: string;
    contractType: 'CALL' | 'PUT' | 'DIGITOVER' | 'DIGITUNDER';
    stake?: number; // Optional if autoStake is true
    duration: number;
    durationUnit?: 'm' | 's' | 'h' | 'd' | 't';
    idempotencyKey?: string;
    useStrategy?: boolean;
    autoStake?: boolean;
}

// ... (router definition)

router.post('/execute', requireAuth, tradeRateLimiter, validateTradeExecution, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Request body already validated by Zod middleware
        let { market, contractType, stake = 10, duration, durationUnit = 'm', useStrategy, autoStake }: ManualTradeRequest = req.body;

        const accounts = await UserService.listDerivAccounts(userId);
        if (accounts.length === 0) {
            // ... (existing account check)
            return res.status(400).json({ error: 'No linked Deriv accounts', hint: 'Please connect your Deriv account' });
        }

        const activeAccountId = await UserService.getActiveAccountId(userId);
        const activeAccount = (activeAccountId ? accounts.find(acc => acc.account_id === activeAccountId) : undefined) || accounts[0];

        if (!activeAccount) {
            return res.status(500).json({ error: 'Internal system error: No valid active account' });
        }

        // ... (existing active account validation)

        // SMART TRADE LOGIC: Auto-Stake
        if (autoStake) {
            const balance = await UserService.getDerivAccountBalance(userId, activeAccount.account_id);
            if (balance) {
                // Risk 5% of balance, clamped between $1 and $100
                const calculatedStake = Math.max(1, Math.min(100, balance * 0.05));
                stake = Math.round(calculatedStake * 100) / 100;
                logger.info('Auto-stake calculated', { userId, balance, calculatedStake: stake });
            }
        }

        // SMART TRADE LOGIC: Strategy Validation
        if (useStrategy) {
            const signal = quantEngine.evaluateMarket(market);

            if (!signal) {
                return res.status(409).json({
                    error: 'Strategy Mismatch',
                    reason: 'No clear signal for this market right now. Try again later.'
                });
            }

            if (signal.type !== contractType) {
                return res.status(409).json({
                    error: 'Strategy Mismatch',
                    reason: `Strategy suggests ${signal.type} but you chose ${contractType}.`,
                    recommendation: signal.type
                });
            }

            // If confident, maybe boost stake? (Optional, kept simple for now)
        }

        const derivToken = await UserService.getDerivTokenForAccount(userId, activeAccount.account_id);
        if (!derivToken) {
            // ... (existing token check)
            return res.status(400).json({ error: 'Deriv token not found', hint: 'Please reconnect' });
        }

        const riskCheck = riskGuard.evaluateManualTrade({
            userId,
            sessionId: `manual:${userId}`,
            market,
            contractType,
            duration,
            durationUnit
        });

        // ... (rest of function)

        if (riskCheck.result === 'REJECTED') {
            return res.status(403).json({
                error: 'Trade blocked by risk guard',
                reason: riskCheck.reason || 'Risk limits exceeded'
            });
        }

        try {
            // DELEGATE TO EXECUTION CORE
            // This ensures correct event firing (TRADE_EXECUTED, TRADE_SETTLED) 
            // and unified logic for both manual and auto trades.
            const result = await executionCore.executeManualTrade({
                userId,
                market,
                contractType,
                stake,
                duration,
                durationUnit: durationUnit || 'm',
                metadata: {
                    payout: 0, // Will be updated by core
                    execution_type: 'MANUAL',
                    account_type: activeAccount.is_virtual ? 'DEMO' : 'REAL'
                }
            });

            return res.status(201).json({
                success: true,
                trade: {
                    id: result.tradeId,
                    contract_id: result.metadata_json.contract_id,
                    transaction_id: result.metadata_json.deriv_ref,
                    buy_price: result.metadata_json.entryPrice,
                    status: 'PENDING',
                    market,
                    contract_type: contractType,
                    stake,
                    duration,
                    executed_at: result.executedAt
                },
                message: 'Trade executed successfully'
            });

        } catch (execError) {
            logger.error('TradeExecution failed in core', { error: execError });
            return res.status(500).json({
                error: 'Trade execution failed',
                details: execError instanceof Error ? execError.message : 'Unknown error'
            });
        }

    } catch (error) {
        logger.error('TradeExecution unexpected error', { error });
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
