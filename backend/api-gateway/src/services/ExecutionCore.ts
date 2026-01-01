/**
 * TraderMind ExecutionCore
 * Service for executing approved trades.
 */

import { EventEmitter } from 'eventemitter3';
import { Redis } from 'ioredis';
import { riskGuard, RiskCheck } from './RiskGuard.js';
import { memoryService } from './MemoryService.js';
import { UserService } from './UserService.js';
import { DerivWSClient } from './DerivWSClient.js';

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

export class ExecutionCore extends EventEmitter<ExecutionCoreEvents> {
    private redis: Redis;

    constructor() {
        super();
        this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        this.initialize();
        console.log('[ExecutionCore] Initialized with Redis Idempotency');
    }

    private initialize(): void {
        // Listen for approved risk checks
        riskGuard.on('risk_check_completed', (check: RiskCheck) => {
            if (check.result === 'APPROVED') {
                // Fire and forget, but handle promise rejection logging if needed
                this.handleApprovedTrade(check).catch(err => {
                    console.error('[ExecutionCore] Error handling trade:', err);
                });
            }
        });
    }

    private async handleApprovedTrade(check: RiskCheck): Promise<void> {
        const idempotencyKey = this.generateIdempotencyKey(check);

        try {
            if (await this.isDuplicate(idempotencyKey)) {
                console.warn(`[ExecutionCore] Duplicate trade skipped: ${idempotencyKey}`);
                return;
            }

            await this.executeTrade(check, idempotencyKey);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[ExecutionCore] EXECUTION_FAILED: ${idempotencyKey} - ${errorMessage}`);

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
        // SET NX EX 3600 (1 hour)
        // Returns 'OK' if set, null if already exists (which means duplicate)
        const result = await this.redis.set(redisKey, '1', 'EX', 3600, 'NX');
        return result === null;
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
     * Execute specific trade (REAL IMPLEMENTATION)
     */
    private async executeTrade(check: RiskCheck, idempotencyKey: string): Promise<void> {
        console.log(`[ExecutionCore] Executing trade for User ${check.userId}: ${check.proposedTrade.market} ${check.proposedTrade.type}`);

        let client: DerivWSClient | null = null;

        try {
            // 1. Get Token securely (Server-side Only)
            const token = await UserService.getDerivToken(check.userId);
            if (!token) {
                throw new Error('USER_NOT_AUTHORIZED_FOR_TRADING: No Deriv token found.');
            }

            // 2. Connector Isolation (New Connection per trade for safety/isolation)
            client = new DerivWSClient();

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
                client!.once('connected', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                client!.connect();
            });

            // 3. Authorize
            const authorized = await client.authorize(token);
            if (!authorized) {
                throw new Error('AUTHORIZATION_FAILED: Invalid Deriv token.');
            }

            // 4. Execute Buy
            // Parameters based on Signal/RiskCheck with dynamic stake from risk config
            const stake = this.calculateStake(check);
            const duration = this.calculateDuration(check);
            
            const buyParams = {
                contract_type: check.proposedTrade.type,
                symbol: check.proposedTrade.market,
                amount: stake,
                basis: 'stake',
                duration: duration.value,
                duration_unit: duration.unit,
                currency: 'USD'
            };

            const buyResult = await client.buyContract(buyParams);

            // 5. Success Result
            const tradeId = buyResult.transaction_id ? String(buyResult.transaction_id) : `trade_${Date.now()}`;
            const contractId = buyResult.contract_id;
            const entryPrice = buyResult.buy_price ?? 0;

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
                    deriv_ref: buyResult.transaction_id
                }
            };

            console.log(`[ExecutionCore] TRADE_EXECUTED: ${tradeId} @ ${entryPrice}`);
            this.emit('TRADE_EXECUTED', result);

            if (check.memoryId) {
                // Record submission first
                memoryService.updateOutcome(check.memoryId, {
                    trade_id: tradeId,
                    result: 'SUBMITTED',
                    settled_at: new Date().toISOString(),
                    pnl: 0
                });
            }

            // 6. Monitor for Settlement (Async but locally blocking this worker connection)
            // We keep the connection open to monitor this specific trade
            if (contractId) {
                console.log(`[ExecutionCore] Waiting for settlement: ${contractId}`);
                await client.monitorContract(contractId);

                await new Promise<void>((resolve) => {
                    const timeout = setTimeout(() => {
                        console.warn(`[ExecutionCore] Settlement timeout for ${contractId}`);
                        resolve();
                    }, 60000 * 5); // 5 min timeout 

                    client!.once('settled', (cId, outcome, profit) => {
                        if (cId === contractId) {
                            clearTimeout(timeout);
                            console.log(`[ExecutionCore] Settlement received: ${outcome} (${profit})`);

                            if (check.memoryId) {
                                const settledAt = new Date().toISOString();
                                const resultIsWin = outcome === 'win';

                                // 1. Operational Update (Mutable)
                                memoryService.updateOutcome(check.memoryId, {
                                    trade_id: tradeId,
                                    result: resultIsWin ? 'WIN' : 'LOSS',
                                    settled_at: settledAt,
                                    pnl: profit
                                });

                                // 2. Immutable Capture (Fire-and-forget)
                                // Extract metadata safely
                                const signal = check.proposedTrade;
                                const meta: any = signal.metadata || {};

                                try {
                                    memoryService.capture({
                                        market: signal.market,
                                        features: meta.technicals || {},
                                        signal: signal,
                                        ai_confidence: meta.ai_inference?.confidence,
                                        regime: meta.ai_inference?.regime,
                                        decision: 'EXECUTED',
                                        result: resultIsWin ? 'WIN' : 'LOSS',
                                        pnl: profit
                                    });
                                } catch (captureErr) {
                                    console.error('[ExecutionCore] Memory capture failed (Ignored):', captureErr);
                                }
                            }
                            resolve();
                        }
                    });
                });
            }

        } finally {
            if (client) {
                client.disconnect();
            }
        }
    }
}

// Export singleton
export const executionCore = new ExecutionCore();
