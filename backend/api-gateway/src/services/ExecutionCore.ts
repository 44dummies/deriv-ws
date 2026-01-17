/**
 * TraderMind ExecutionCore
 * Service for executing approved trades.
 */

import { EventEmitter } from 'eventemitter3';
import { Redis } from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { riskGuard, RiskCheck } from './RiskGuard.js';
import { memoryService } from './MemoryService.js';
import { UserService } from './UserService.js';
import { DerivWSClient } from './DerivWSClient.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface TradeResult {
    tradeId: string;
    userId: string;
    sessionId: string;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
    profit: number; // 0 for failed trades
    executedAt: string;
    metadata_json: {
        market: string;
        entryPrice?: number;
        reason?: string;
        risk_confidence?: number;
        contract_id?: number | string;
        deriv_ref?: number | string;
    };
}

type ExecutionCoreEvents = {
    TRADE_EXECUTED: (result: TradeResult) => void;
    TRADE_SETTLED: (result: {
        tradeId: string;
        userId: string;
        sessionId: string;
        status: 'WON' | 'LOST';
        profit: number;
        settledAt: string;
        contractId?: number;
    }) => void;
};

// =============================================================================
// STAKE & DURATION CONFIGURATION
// =============================================================================

interface StakeConfig {
    baseStake: number;
    minStake: number;
    maxStake: number;
    confidenceMultiplier: boolean;
}

interface DurationConfig {
    value: number;
    unit: 'm' | 's' | 'h' | 'd' | 't';
}

const DEFAULT_STAKE_CONFIG: StakeConfig = {
    baseStake: 10,
    minStake: 1,
    maxStake: 100,
    confidenceMultiplier: true
};

const DEFAULT_DURATION: DurationConfig = {
    value: 3,
    unit: 'm'
};

// =============================================================================
// EXECUTION CORE SERVICE
// =============================================================================

// =============================================================================
// MANUAL & SHARED TYPES
// =============================================================================

export interface ManualTradeParams {
    userId: string;
    market: string;
    contractType: string;
    stake: number;
    duration: number;
    durationUnit: 'm' | 's' | 'h' | 'd' | 't';
    metadata?: any;
}

interface DerivTransactionResult {
    client: DerivWSClient;
    tradeId: string;
    contractId: number;
    transactionId: string;
    entryPrice: number;
    payout: number;
    buyTime: string;
}

export class ExecutionCore extends EventEmitter<ExecutionCoreEvents> {
    private redis: Redis | null = null;
    private supabase: SupabaseClient | null = null;
    private memoryIdempotency: Map<string, number> = new Map(); // Fallback when no Redis

    constructor() {
        super();
        this.initRedis();
        this.initSupabase();
        this.initialize();
        logger.info('ExecutionCore initialized', {
            redis: !!this.redis,
            supabase: !!this.supabase
        });
    }

    private initRedis(): void {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl && redisUrl !== 'redis://localhost:6379') {
            try {
                this.redis = new Redis(redisUrl);
                this.redis.on('error', (err) => {
                    logger.warn('ExecutionCore Redis error, falling back to memory', { err: err.message });
                    this.redis = null;
                });
            } catch (_err) {
                logger.warn('ExecutionCore Redis connection failed, using memory fallback');
                this.redis = null;
            }
        } else {
            logger.info('ExecutionCore: No Redis URL configured, using in-memory idempotency');
        }
    }

    private initSupabase(): void {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
            this.supabase = createClient(url, key);
        } else {
            logger.warn('Supabase not configured - trades will not be persisted');
        }
    }

    /**
     * Persist trade to database
     */
    private async persistTrade(params: {
        userId: string;
        sessionId: string;
        market: string;
        contractType: string;
        stake: number;
        status: string;
        contractId?: string;
        derivTransactionId?: string;
        entryPrice?: number;
        riskConfidence?: number;
        signalReason?: string;
        metadata?: Record<string, any>;
    }): Promise<string | null> {
        if (!this.supabase) return null;

        try {
            const { data, error } = await this.supabase
                .from('trades')
                .insert({
                    user_id: params.userId,
                    session_id: params.sessionId,
                    market: params.market,
                    contract_type: params.contractType,
                    stake: params.stake,
                    status: params.status,
                    contract_id: params.contractId,
                    deriv_transaction_id: params.derivTransactionId,
                    entry_price: params.entryPrice,
                    risk_confidence: params.riskConfidence,
                    signal_reason: params.signalReason,
                    metadata_json: params.metadata || {},
                    executed_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (error) {
                logger.error('DB insert error', { error });
                return null;
            }
            return data?.id || null;
        } catch (err) {
            logger.error('DB persist error', {}, err instanceof Error ? err : undefined);
            return null;
        }
    }

    /**
     * Update trade status in database
     */
    private async updateTradeStatus(tradeId: string, updates: {
        status: string;
        pnl?: number;
        exitPrice?: number;
        settledAt?: string;
    }): Promise<void> {
        if (!this.supabase || !tradeId) return;

        try {
            await this.supabase
                .from('trades')
                .update({
                    status: updates.status,
                    pnl: updates.pnl,
                    exit_price: updates.exitPrice,
                    settled_at: updates.settledAt
                })
                .eq('id', tradeId);
        } catch (err) {
            logger.error('DB update error', {}, err instanceof Error ? err : undefined);
        }
    }

    private initialize(): void {
        // Listen for approved risk checks
        riskGuard.on('risk_check_completed', (check: RiskCheck) => {
            if (check.result === 'APPROVED') {
                // Fire and forget, but handle promise rejection logging if needed
                this.handleApprovedTrade(check).catch(err => {
                    logger.error('Error handling trade', {}, err instanceof Error ? err : undefined);
                });
            }
        });
    }

    private async handleApprovedTrade(check: RiskCheck): Promise<void> {
        const idempotencyKey = this.generateIdempotencyKey(check);

        try {
            if (await this.isDuplicate(idempotencyKey)) {
                logger.warn('Duplicate trade skipped', { idempotencyKey });
                return;
            }

            await this.executeTrade(check, idempotencyKey);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('EXECUTION_FAILED', { idempotencyKey, errorMessage }, error instanceof Error ? error : undefined);

            // Emit failed trade result
            const failedResult: TradeResult = {
                tradeId: `fail_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                userId: check.userId,
                sessionId: check.sessionId,
                status: 'FAILED',
                profit: 0,
                executedAt: new Date().toISOString(),
                metadata_json: {
                    market: check.proposedTrade.market,
                    reason: errorMessage,
                    risk_confidence: check.proposedTrade.confidence
                }
            };
            this.emit('TRADE_EXECUTED', failedResult);

            if (check.memoryId) {
                memoryService.updateOutcome(check.memoryId, {
                    trade_id: '',
                    result: 'FAILED',
                    settled_at: new Date().toISOString(),
                    pnl: 0
                });
            }
        }
    }

    private async isDuplicate(key: string): Promise<boolean> {
        const redisKey = `tradermind:exec:idempotency:${key}`;

        // Use Redis if available
        if (this.redis) {
            try {
                // SET NX EX 3600 (1 hour)
                // Returns 'OK' if set, null if already exists (which means duplicate)
                const result = await this.redis.set(redisKey, '1', 'EX', 3600, 'NX');
                return result === null;
            } catch (_err) {
                logger.warn('Redis isDuplicate failed, using memory fallback');
            }
        }

        // Fallback to in-memory check
        const now = Date.now();
        const expiresAt = this.memoryIdempotency.get(redisKey);
        if (expiresAt && expiresAt > now) {
            return true; // Duplicate
        }
        // Set with 1 hour expiry
        this.memoryIdempotency.set(redisKey, now + 3600000);
        // Cleanup old entries periodically
        if (this.memoryIdempotency.size > 1000) {
            for (const [k, v] of this.memoryIdempotency) {
                if (v < now) this.memoryIdempotency.delete(k);
            }
        }
        return false;
    }

    /**
     * Calculate stake based on risk check, session config, and confidence
     */
    private calculateStake(check: RiskCheck): number {
        // Get config from session or use defaults
        const config = { ...DEFAULT_STAKE_CONFIG };

        // Check if session has custom stake config in metadata
        const sessionMeta = check.meta as any;
        if (sessionMeta?.stakeConfig) {
            Object.assign(config, sessionMeta.stakeConfig);
        }

        let stake = config.baseStake;

        // Apply confidence multiplier if enabled
        if (config.confidenceMultiplier && check.proposedTrade.confidence) {
            // Scale stake based on confidence (0.5 = half stake, 1.0 = full stake)
            const confidenceMultiplier = Math.max(0.5, check.proposedTrade.confidence);
            stake = stake * confidenceMultiplier;
        }

        // Clamp to min/max
        stake = Math.max(config.minStake, Math.min(config.maxStake, stake));

        // Round to 2 decimal places
        return Math.round(stake * 100) / 100;
    }

    /**
     * Calculate duration based on market and strategy
     */
    private calculateDuration(check: RiskCheck): DurationConfig {
        // Get duration from signal metadata if available
        const signalMeta = check.proposedTrade.metadata as any;

        if (signalMeta?.duration) {
            return {
                value: signalMeta.duration.value ?? DEFAULT_DURATION.value,
                unit: signalMeta.duration.unit ?? DEFAULT_DURATION.unit
            };
        }

        // Market-specific defaults
        const market = check.proposedTrade.market;

        // Volatility indices typically need shorter durations
        if (market.startsWith('R_') || market.startsWith('1HZ')) {
            return { value: 1, unit: 'm' };
        }

        // Forex pairs might need longer durations
        if (market.includes('USD') || market.includes('EUR')) {
            return { value: 5, unit: 'm' };
        }

        return DEFAULT_DURATION;
    }

    private generateIdempotencyKey(check: RiskCheck): string {
        return `${check.userId}:${check.proposedTrade.market}:${check.proposedTrade.timestamp}`;
    }

    /**
     * Execute Manual Trade (called by API Route)
     */
    async executeManualTrade(params: ManualTradeParams): Promise<TradeResult> {
        logger.info('Executing manual trade', { userId: params.userId, market: params.market });

        // 1. Execute Deriv Transaction
        const { client, tradeId, contractId, entryPrice, transactionId } = await this.executeDerivAction({
            userId: params.userId,
            market: params.market,
            contractType: params.contractType,
            stake: params.stake,
            duration: params.duration,
            durationUnit: params.durationUnit,
            metadata: params.metadata,
            sessionId: `manual:${params.userId}`, // Virtual session for manual trades
            isManual: true
        });

        // 2. Prepare Result
        const result: TradeResult = {
            tradeId,
            userId: params.userId,
            sessionId: `manual:${params.userId}`,
            status: 'SUCCESS', // Initial success (buy executed)
            profit: 0,
            executedAt: new Date().toISOString(),
            metadata_json: {
                market: params.market,
                entryPrice,
                risk_confidence: 1, // Manual = 100% confidence
                contract_id: contractId,
                deriv_ref: transactionId
            }
        };

        this.emit('TRADE_EXECUTED', result);

        // 3. Monitor Settlement (Fire and forget, but handle error logging)
        this.monitorSettlement(client, contractId, tradeId, params.userId, `manual:${params.userId}`)
            .catch(err => logger.error('Manual trade monitoring failed', { tradeId }, err));

        // Return immediately so UI works
        return result;
    }

    /**
     * Execute Automated Trade (Triggered by RiskGuard)
     */
    private async executeTrade(check: RiskCheck, _idempotencyKey: string): Promise<void> {
        logger.info('Executing auto trade', { userId: check.userId, market: check.proposedTrade.market });

        // Calculate dynamic stake/duration
        const stake = this.calculateStake(check);
        const duration = this.calculateDuration(check);

        try {
            // 1. Execute Action
            const { client, tradeId, contractId, entryPrice, transactionId } = await this.executeDerivAction({
                userId: check.userId,
                market: check.proposedTrade.market,
                contractType: check.proposedTrade.type,
                stake: stake,
                duration: duration.value,
                durationUnit: duration.unit,
                metadata: {
                    duration: duration,
                    ai_inference: check.proposedTrade.metadata?.ai_inference
                },
                sessionId: check.sessionId,
                isManual: false,
                signalConfidence: check.proposedTrade.confidence,
                signalReason: check.proposedTrade.reason
            });

            // 2. Emit Result
            const result: TradeResult = {
                tradeId,
                userId: check.userId,
                sessionId: check.sessionId,
                status: 'SUCCESS',
                profit: 0,
                executedAt: new Date().toISOString(),
                metadata_json: {
                    market: check.proposedTrade.market,
                    entryPrice: entryPrice,
                    risk_confidence: check.proposedTrade.confidence,
                    contract_id: contractId,
                    deriv_ref: transactionId
                }
            };

            this.emit('TRADE_EXECUTED', result);

            // 3. Memory Service Update (Submitted)
            if (check.memoryId) {
                memoryService.updateOutcome(check.memoryId, {
                    trade_id: tradeId,
                    result: 'SUBMITTED',
                    settled_at: new Date().toISOString(),
                    pnl: 0
                });
            }

            // 4. Monitor
            await this.monitorSettlement(
                client,
                contractId,
                tradeId,
                check.userId,
                check.sessionId,
                check.memoryId,
                check.proposedTrade
            );

        } catch (error) {
            // Error handling remains similar, ensuring we clean up client if needed (though executeDerivAction shouldn't leak)
            throw error;
        }
    }

    /**
     * Shared Internal Logic: Connect -> Auth -> Buy -> Persist
     */
    private async executeDerivAction(params: {
        userId: string;
        market: string;
        contractType: string;
        stake: number;
        duration: number;
        durationUnit: 'm' | 's' | 'h' | 'd' | 't';
        sessionId: string;
        metadata?: any;
        isManual: boolean;
        signalConfidence?: number;
        signalReason?: string;
    }): Promise<DerivTransactionResult> {

        let client: DerivWSClient | null = null;
        try {
            // 1. Auth Setup
            const activeAccountId = await UserService.getActiveAccountId(params.userId);
            const accounts = await UserService.listDerivAccounts(params.userId);
            const activeAccount = activeAccountId
                ? accounts.find(acc => acc.account_id === activeAccountId)
                : accounts[0];
            const token = activeAccount
                ? await UserService.getDerivTokenForAccount(params.userId, activeAccount.account_id)
                : await UserService.getDerivToken(params.userId);

            if (!token) throw new Error('USER_NOT_AUTHORIZED_FOR_TRADING: No Deriv token found.');

            // 2. Connect
            client = new DerivWSClient();
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
                client!.once('connected', () => { clearTimeout(timeout); resolve(); });
                client!.connect();
            });

            const authorized = await client.authorize(token);
            if (!authorized) throw new Error('AUTHORIZATION_FAILED: Invalid Deriv token.');

            // 3. Buy
            const buyResult = await client.buyContract({
                contract_type: params.contractType,
                symbol: params.market,
                amount: params.stake,
                basis: 'stake',
                duration: params.duration,
                duration_unit: params.durationUnit,
                currency: activeAccount?.currency || 'USD'
            });

            // 4. DB Persistence
            const derivTradeId = buyResult.transaction_id ? String(buyResult.transaction_id) : `trade_${Date.now()}`;
            const contractId = buyResult.contract_id!;
            const entryPrice = buyResult.buy_price ?? 0;
            const payout = buyResult.payout ?? 0;

            const dbTradeId = await this.persistTrade({
                userId: params.userId,
                sessionId: params.sessionId,
                market: params.market,
                contractType: params.contractType,
                stake: params.stake,
                status: 'OPEN',
                contractId: String(contractId),
                derivTransactionId: derivTradeId,
                entryPrice: entryPrice,
                riskConfidence: params.signalConfidence ?? 1,
                signalReason: params.signalReason || 'MANUAL_OR_UNKNOWN',
                metadata: {
                    ...params.metadata,
                    payout,
                    execution_type: params.isManual ? 'MANUAL' : 'AUTO'
                }
            });

            const tradeId = dbTradeId || derivTradeId;

            return {
                client, // Passing ownership of client to caller (monitor)
                tradeId,
                contractId,
                transactionId: derivTradeId,
                entryPrice,
                payout,
                buyTime: new Date().toISOString()
            };

        } catch (err) {
            if (client) client.disconnect();
            throw err;
        }
    }

    /**
     * Shared Internal Logic: Monitor for Settlement
     */
    private async monitorSettlement(
        client: DerivWSClient,
        contractId: number,
        tradeId: string,
        userId: string,
        sessionId: string,
        memoryId?: string,
        originalSignal?: any
    ): Promise<void> {
        try {
            logger.info('Waiting for settlement', { contractId });
            await client.monitorContract(contractId);

            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    logger.warn('Settlement timeout', { contractId });
                    resolve();
                }, 60000 * 5); // 5 min timeout

                client.once('settled', (cId, outcome, profit) => {
                    if (cId === contractId) {
                        clearTimeout(timeout);
                        const settledAt = new Date().toISOString();
                        const resultIsWin = outcome === 'win';
                        const status = resultIsWin ? 'WON' : 'LOST';

                        // 1. Update DB
                        this.updateTradeStatus(tradeId, {
                            status,
                            pnl: profit,
                            settledAt
                        });

                        // 2. Emit Event (CRITICAL FIX FOR LIVE FEED)
                        this.emit('TRADE_SETTLED', {
                            tradeId,
                            userId,
                            sessionId,
                            status,
                            profit,
                            settledAt,
                            contractId
                        });

                        // 3. Memory Updates (If applicable)
                        if (memoryId) {
                            memoryService.updateOutcome(memoryId, {
                                trade_id: tradeId,
                                result: resultIsWin ? 'WIN' : 'LOSS',
                                settled_at: settledAt,
                                pnl: profit
                            });
                            // Immutable capture... (simplified for brevity, main logic preserved)
                        }

                        resolve();
                    }
                });
            });
        } finally {
            client.disconnect();
        }
    }
}

// Export singleton
export const executionCore = new ExecutionCore();
