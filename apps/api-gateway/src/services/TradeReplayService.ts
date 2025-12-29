/**
 * TraderMind TradeReplayService
 * Reconstructs execution history from immutable trade logs.
 * PRD Phase 7 Requirement.
 */

import { createClient } from "@supabase/supabase-js";

export interface ReplayEvent {
    timestamp: string;
    type: 'TRADE_EXECUTED' | 'TRADE_FAILED';
    data: any;
}

export class TradeReplayService {
    private supabase;

    constructor() {
        const supabaseUrl = process.env['SUPABASE_URL'];
        const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

        if (!supabaseUrl || !supabaseKey) {
            console.warn('[TradeReplayService] Missing Supabase credentials. Replay unavailable.');
        } else {
            this.supabase = createClient(supabaseUrl, supabaseKey, {
                auth: { persistSession: false, autoRefreshToken: false }
            });
        }
    }

    /**
     * Get replay timeline for a session
     */
    async getSessionReplay(sessionId: string): Promise<ReplayEvent[]> {
        if (!this.supabase) {
            throw new Error('Replay service not initialized');
        }

        const { data: trades, error } = await this.supabase
            .from('trades')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch trades: ${error.message}`);
        }

        // Convert to uniform Event stream
        return (trades || []).map(trade => ({
            timestamp: trade.created_at,
            type: trade.status === 'COMPLETED' ? 'TRADE_EXECUTED' : 'TRADE_FAILED',
            data: {
                tradeId: trade.id,
                market: trade.market,
                result: trade.result, // Win/Loss/etc
                profit: trade.profit,
                metadata: trade.metadata_json
            }
        }));
    }

    /**
     * Verify Idempotency (Audit Check)
     * Checks if any trade has duplicate idempotency keys
     */
    async auditIdempotency(sessionId: string): Promise<{ total: number, duplicates: number, duplicateKeys: string[] }> {
        if (!this.supabase) return { total: 0, duplicates: 0, duplicateKeys: [] };

        const { data: trades } = await this.supabase
            .from('trades')
            .select('metadata_json')
            .eq('session_id', sessionId);

        if (!trades) return { total: 0, duplicates: 0, duplicateKeys: [] };

        const seenKeys = new Set<string>();
        const duplicates = [];

        for (const t of trades) {
            const key = t.metadata_json?.idempotencyKey;
            if (key) {
                if (seenKeys.has(key)) {
                    duplicates.push(key);
                }
                seenKeys.add(key);
            }
        }

        return {
            total: trades.length,
            duplicates: duplicates.length,
            duplicateKeys: duplicates
        };
    }
}

export const tradeReplayService = new TradeReplayService();
