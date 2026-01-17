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

        // Create Deriv client and authorize
        const derivClient = new DerivWSClient();
        derivClient.connect();

        try {
            await waitForConnection(derivClient);
            const auth = await derivClient.authorize(derivToken);
            if (!auth) {
                throw new Error('Deriv authorization failed');
            }
        } catch (authError) {
            derivClient.disconnect();
            return res.status(401).json({
                error: 'Deriv authorization failed',
                details: authError instanceof Error ? authError.message : 'Unknown error'
            });
        }

        // Prepare contract parameters
        const contractParams = {
            contract_type: contractType,
            symbol: market,
            amount: stake,
            basis: 'stake' as 'stake' | 'payout',
            duration,
            duration_unit: durationUnit,
            currency: activeAccount.currency || 'USD'
        };

        // Execute the buy contract
        let buyResponse;
        try {
            buyResponse = await derivClient.buyContract(contractParams);
        } catch (buyError) {
            derivClient.disconnect();
            return res.status(500).json({
                error: 'Trade execution failed',
                details: buyError instanceof Error ? buyError.message : 'Unknown error'
            });
        }

        // Extract trade details
        const contractId = buyResponse.contract_id;
        const transactionId = buyResponse.transaction_id;
        const buyPrice = buyResponse.buy_price;
        const payout = buyResponse.payout;

        if (!contractId) {
            derivClient.disconnect();
            return res.status(500).json({ error: 'Failed to get contract ID from Deriv' });
        }

        // Get or create active session for this user
        let sessionId: string | null = null;

        const { data: activeSessions } = await supabase
            .from('sessions')
            .select('id')
            .eq('admin_id', userId)
            .in('status', ['ACTIVE', 'RUNNING'])
            .limit(1);

        if (activeSessions && activeSessions.length > 0 && activeSessions[0]) {
            sessionId = activeSessions[0].id;
        } else {
            // Create a manual trading session
            const { data: newSession } = await supabase
                .from('sessions')
                .insert({
                    admin_id: userId,
                    status: 'ACTIVE',
                    config_json: {
                        type: 'MANUAL',
                        risk_profile: 'USER_CONTROLLED'
                    },
                    started_at: new Date().toISOString()
                })
                .select('id')
                .single();

            sessionId = newSession?.id || null;
        }

        // Persist trade to database
        const tradeId = crypto.randomUUID();
        const { idempotencyKey } = req.body as ManualTradeRequest;

        const { data: trade, error: tradeError } = await supabase
            .from('trades')
            .insert({
                id: tradeId,
                user_id: userId,
                session_id: sessionId,
                market,
                contract_type: contractType,
                stake,
                status: 'PENDING',
                contract_id: contractId.toString(),
                deriv_transaction_id: transactionId?.toString(),
                entry_price: buyPrice,
                idempotency_key: idempotencyKey || null, // For retry safety
                metadata_json: {
                    duration,
                    duration_unit: durationUnit,
                    payout,
                    execution_type: 'MANUAL',
                    account_type: activeAccount.is_virtual ? 'DEMO' : 'REAL'
                },
                executed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (tradeError) {
            logger.error('TradeExecution DB insert error', { tradeError, tradeId, contractId });
            // Trade was executed on Deriv but DB insert failed - log for reconciliation
        }

        // Monitor contract settlement (async)
        monitorContractSettlement(derivClient, contractId, tradeId).catch(err => logger.error('TradeExecution monitor error', { err }));

        return res.status(201).json({
            success: true,
            trade: {
                id: tradeId,
                contract_id: contractId,
                transaction_id: transactionId,
                buy_price: buyPrice,
                payout,
                status: 'PENDING',
                market,
                contract_type: contractType,
                stake,
                duration,
                executed_at: trade?.executed_at
            },
            message: 'Trade executed successfully'
        });

    } catch (error) {
        logger.error('TradeExecution unexpected error', { error });
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Monitor contract settlement and update DB when contract closes
 * TODO: Add proper contract subscription method to DerivWSClient
 */
async function monitorContractSettlement(
    derivClient: DerivWSClient,
    contractId: number,
    tradeId: string
): Promise<void> {
    try {
        // Listen for settlement event
        // Note: DerivWSClient should emit 'settled' when contract closes
        derivClient.once('settled', async (settledContractId, result, profit) => {
            if (settledContractId === contractId) {
                // FIX: Use WON/LOST to match DB constraint, not WIN/LOSS
                const status = result === 'win' ? 'WON' : 'LOST';

                await supabase
                    .from('trades')
                    .update({
                        status,
                        pnl: profit,
                        settled_at: new Date().toISOString()
                    })
                    .eq('id', tradeId);

                logger.info('TradeExecution contract settled', { contractId, status, profit });

                // Disconnect after settlement
                derivClient.disconnect();
            }
        });

        await derivClient.monitorContract(contractId);
    } catch (error) {
        logger.error('TradeExecution settlement monitoring failed', { error, contractId });
        derivClient.disconnect();
    }
}

export default router;

async function waitForConnection(client: DerivWSClient, timeoutMs = 5000): Promise<void> {
    if (client.isConnected()) return;

    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Deriv connection timeout')), timeoutMs);
        client.once('connected', () => {
            clearTimeout(timeout);
            resolve();
        });
    });
}
