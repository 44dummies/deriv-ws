/**
 * TraderMind ExecutionCore
 * Service for executing approved trades.
 */

import { EventEmitter } from 'eventemitter3';
import Redis from 'ioredis';
import { riskGuard, RiskCheck } from './RiskGuard.js';
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

        if (await this.isDuplicate(idempotencyKey)) {
            console.warn(`[ExecutionCore] Duplicate trade skipped: ${idempotencyKey}`);
            return;
        }

        try {
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
        }
    }

    private async isDuplicate(key: string): Promise<boolean> {
        const redisKey = `tradermind:exec:idempotency:${key}`;
        // SET NX EX 3600 (1 hour)
        // Returns 'OK' if set, null if already exists (which means duplicate)
        const result = await this.redis.set(redisKey, '1', 'EX', 3600, 'NX');
        return result === null;
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
            // Parameters based on Signal/RiskCheck
            // Currently using simple market buy
            const buyParams = {
                contract_type: check.proposedTrade.type,
                symbol: check.proposedTrade.market,
                amount: 10, // Default stake (TODO: Get from RiskCheck / Config)
                basis: 'stake',
                duration: 3, // Default duration (TODO: Get from strategy)
                duration_unit: 'm',
                currency: 'USD'
            };

            const buyResult = await client.buyContract(buyParams);

            // 5. Success Result
            const tradeId = buyResult.transaction_id ? String(buyResult.transaction_id) : `trade_${Date.now()}`;
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
                    contract_id: buyResult.contract_id,
                    deriv_ref: buyResult.transaction_id
                }
            };

            console.log(`[ExecutionCore] TRADE_EXECUTED: ${tradeId} @ ${entryPrice}`);
            this.emit('TRADE_EXECUTED', result);

        } finally {
            if (client) {
                client.disconnect();
            }
        }
    }
}

// Export singleton
export const executionCore = new ExecutionCore();
