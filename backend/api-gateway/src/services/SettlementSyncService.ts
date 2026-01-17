/**
 * TraderMind Settlement Sync Service
 * Synchronizes trade settlement status from Deriv API
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DerivWSClient } from './DerivWSClient.js';
import { UserService } from './UserService.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface SyncResult {
    userId: string;
    synced: number;
    updated: number;
    errors: number;
    details: {
        tradeId: string;
        contractId: string;
        previousStatus: string;
        newStatus: string;
        pnl?: number;
    }[];
}

interface OpenTrade {
    id: string;
    user_id: string;
    contract_id: string;
    status: string;
    stake: number;
}

// =============================================================================
// SETTLEMENT SYNC SERVICE
// =============================================================================

class SettlementSyncService {
    private supabase: SupabaseClient | null = null;

    constructor() {
        this.initSupabase();
    }

    private initSupabase(): void {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
            this.supabase = createClient(url, key);
        } else {
            logger.warn('SettlementSyncService: Supabase not configured');
        }
    }

    /**
     * Sync all open trades for a specific user
     */
    async syncUserTrades(userId: string): Promise<SyncResult> {
        const result: SyncResult = {
            userId,
            synced: 0,
            updated: 0,
            errors: 0,
            details: []
        };

        if (!this.supabase) {
            logger.error('SettlementSync: Supabase not available');
            return result;
        }

        try {
            // 1. Get open trades for user
            const { data: openTrades, error } = await this.supabase
                .from('trades')
                .select('id, user_id, contract_id, status, stake')
                .eq('user_id', userId)
                .in('status', ['OPEN', 'PENDING'])
                .not('contract_id', 'is', null);

            if (error) {
                logger.error('SettlementSync: Failed to fetch open trades', { error, userId });
                return result;
            }

            if (!openTrades || openTrades.length === 0) {
                logger.info('SettlementSync: No open trades to sync', { userId });
                return result;
            }

            result.synced = openTrades.length;
            logger.info('SettlementSync: Found open trades', { userId, count: openTrades.length });

            // 2. Get user's Deriv token
            const token = await UserService.getDerivToken(userId);
            if (!token) {
                logger.error('SettlementSync: No Deriv token for user', { userId });
                result.errors = openTrades.length;
                return result;
            }

            // 3. Connect to Deriv and query each contract
            const client = new DerivWSClient();

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
                client.once('connected', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                client.connect();
            });

            const authorized = await client.authorize(token);
            if (!authorized) {
                client.disconnect();
                logger.error('SettlementSync: Authorization failed', { userId });
                result.errors = openTrades.length;
                return result;
            }

            // 4. Query each contract
            for (const trade of openTrades) {
                try {
                    const contractStatus = await this.queryContractStatus(client, trade.contract_id);

                    if (contractStatus.is_sold) {
                        const newStatus = contractStatus.profit >= 0 ? 'WON' : 'LOST';

                        // Update database
                        const { error: updateError } = await this.supabase
                            .from('trades')
                            .update({
                                status: newStatus,
                                pnl: contractStatus.profit,
                                exit_price: contractStatus.sell_price,
                                settled_at: new Date().toISOString()
                            })
                            .eq('id', trade.id);

                        if (updateError) {
                            logger.error('SettlementSync: Failed to update trade', { tradeId: trade.id, error: updateError });
                            result.errors++;
                        } else {
                            result.updated++;
                            result.details.push({
                                tradeId: trade.id,
                                contractId: trade.contract_id,
                                previousStatus: trade.status,
                                newStatus,
                                pnl: contractStatus.profit
                            });
                            logger.info('SettlementSync: Updated trade', { tradeId: trade.id, status: newStatus, pnl: contractStatus.profit });
                        }
                    } else {
                        // Contract still open
                        logger.info('SettlementSync: Contract still open', { tradeId: trade.id, contractId: trade.contract_id });
                    }
                } catch (err) {
                    logger.error('SettlementSync: Error querying contract', { tradeId: trade.id, error: err });
                    result.errors++;
                }
            }

            client.disconnect();
            logger.info('SettlementSync: Completed', { userId, result });
            return result;

        } catch (error) {
            logger.error('SettlementSync: Unexpected error', { userId, error });
            return result;
        }
    }

    /**
     * Query a single contract's current status from Deriv
     */
    private async queryContractStatus(client: DerivWSClient, contractId: string): Promise<{
        is_sold: boolean;
        profit: number;
        sell_price?: number;
        status?: string;
    }> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Contract query timeout')), 10000);

            // Send proposal_open_contract request
            const ws = (client as any).ws;
            if (!ws || ws.readyState !== 1) {
                clearTimeout(timeout);
                reject(new Error('WebSocket not connected'));
                return;
            }

            const reqId = Date.now();
            const messageHandler = (data: any) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.req_id === reqId && msg.proposal_open_contract) {
                        clearTimeout(timeout);
                        ws.off('message', messageHandler);
                        const contract = msg.proposal_open_contract;
                        resolve({
                            is_sold: contract.is_sold === 1 || contract.is_sold === true,
                            profit: contract.profit || 0,
                            sell_price: contract.sell_price,
                            status: contract.status
                        });
                    } else if (msg.req_id === reqId && msg.error) {
                        clearTimeout(timeout);
                        ws.off('message', messageHandler);
                        reject(new Error(msg.error.message));
                    }
                } catch (_e) {
                    // Parse error, ignore
                }
            };

            ws.on('message', messageHandler);
            ws.send(JSON.stringify({
                proposal_open_contract: 1,
                contract_id: contractId,
                req_id: reqId
            }));
        });
    }

    /**
     * Sync all open trades across all users (admin function)
     */
    async syncAllOpenTrades(): Promise<SyncResult[]> {
        if (!this.supabase) {
            logger.error('SettlementSync: Supabase not available');
            return [];
        }

        // Get all users with open trades
        const { data: trades, error } = await this.supabase
            .from('trades')
            .select('user_id')
            .in('status', ['OPEN', 'PENDING'])
            .not('contract_id', 'is', null);

        if (error || !trades) {
            logger.error('SettlementSync: Failed to fetch trades', { error });
            return [];
        }

        // Get unique user IDs
        const userIds = [...new Set(trades.map(t => t.user_id))];

        const results: SyncResult[] = [];
        for (const userId of userIds) {
            const result = await this.syncUserTrades(userId);
            results.push(result);
        }

        return results;
    }
}

// Export singleton
export const settlementSyncService = new SettlementSyncService();
