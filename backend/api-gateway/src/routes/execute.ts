/**
 * Manual Trade Execution Endpoint
 * Allows users to execute trades directly (not just via AI)
 */

import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import { DerivWSClient } from '../services/DerivWSClient.js';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const router = Router();

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Type definitions
interface ManualTradeRequest {
    market: string; // e.g., 'R_100', 'frxEURUSD'
    contractType: 'CALL' | 'PUT' | 'DIGITOVER' | 'DIGITUNDER'; // Rise/Fall, Higher/Lower
    stake: number;
    duration: number; // in minutes
    durationUnit?: 'm' | 's' | 'h' | 'd' | 't'; // default 'm' (minutes)
}

/**
 * POST /api/v1/trades/execute
 * Execute a manual trade
 */
router.post('/execute', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { market, contractType, stake, duration, durationUnit = 'm' }: ManualTradeRequest = req.body;

        // Validation
        if (!market || !contractType || !stake || !duration) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                required: ['market', 'contractType', 'stake', 'duration']
            });
        }

        if (stake < 1 || stake > 10000) {
            return res.status(400).json({ error: 'Stake must be between 1 and 10000' });
        }

        if (duration < 1 || duration > 1440) {
            return res.status(400).json({ error: 'Duration must be between 1 and 1440 minutes' });
        }

        // Get user's active Deriv account
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('deriv_accounts, active_account_id')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        const activeAccount = userData.deriv_accounts?.find(
            (acc: any) => acc.loginid === userData.active_account_id
        );

        if (!activeAccount || !activeAccount.token) {
            return res.status(400).json({ 
                error: 'No active Deriv account or token missing',
                hint: 'Please reconnect your Deriv account'
            });
        }

        // Create Deriv client and authorize
        const derivClient = new DerivWSClient();
        derivClient.connect();

        try {
            await derivClient.authorize(activeAccount.token);
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
        const contractId = buyResponse.buy?.contract_id;
        const transactionId = buyResponse.buy?.transaction_id;
        const buyPrice = buyResponse.buy?.buy_price;
        const payout = buyResponse.buy?.payout;

        if (!contractId) {
            derivClient.disconnect();
            return res.status(500).json({ error: 'Failed to get contract ID from Deriv' });
        }

        // Get or create active session for this user
        let sessionId: string | null = null;
        
        const { data: activeSessions } = await supabase
            .from('trading_sessions')
            .select('id')
            .eq('admin_id', userId)
            .eq('status', 'ACTIVE')
            .limit(1);

        if (activeSessions && activeSessions.length > 0 && activeSessions[0]) {
            sessionId = activeSessions[0].id;
        } else {
            // Create a manual trading session
            const { data: newSession } = await supabase
                .from('trading_sessions')
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
 */
async function monitorContractSettlement(
    derivClient: DerivWSClient, 
    contractId: number, 
    tradeId: string
): Promise<void> {
    derivClient.once('settled', async (settledContractId, result, profit) => {
        if (settledContractId === contractId) {
            const status = result === 'win' ? 'WIN' : 'LOSS';
            
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
}

export default router;
