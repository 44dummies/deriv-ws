/**
 * TraderMind MemoryService
 * Handles the immutable recording of decision cycles for AI learning.
 * Design: Fire-and-forget, non-blocking.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface MemoryRecord {
    id?: string; // Allow pre-generated ID
    session_id: string;
    user_id?: string;
    market: string;
    timestamp: string;
    technicals: any;
    ai_inference?: any;
    signal: any;
    risk_check: any;
}

export interface OutcomeUpdate {
    trade_id: string;
    result: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'REJECTED' | 'FAILED' | 'SUBMITTED' | 'BLOCKED';
    pnl?: number;
    settled_at: string;
}

// =============================================================================
// MEMORY SERVICE
// =============================================================================

export class MemoryService {
    private supabase: SupabaseClient | null = null;
    private enabled: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (url && key) {
            this.supabase = createClient(url, key, {
                auth: { persistSession: false, autoRefreshToken: false }
            });
            this.enabled = true;
            console.log('[MemoryService] Initialized (Supabase connected)');
        } else {
            console.warn('[MemoryService] Disabled (Missing Supabase credentials)');
        }
    }

    /**
     * Record a decision cycle (Fire-and-forget)
     */
    async recordDecision(record: MemoryRecord): Promise<string | null> {
        if (!this.enabled || !this.supabase) return null;

        // Non-blocking attempt
        // We use a promise wrapper to catch errors without crashing execution flow if not awaited at top level
        try {
            const { data, error } = await this.supabase
                .from('memories')
                .insert(record)
                .select('id')
                .single();

            if (error) {
                console.error('[MemoryService] Failed to record memory:', error.message);
                return null;
            }

            return data?.id || null;
        } catch (err) {
            console.error('[MemoryService] Unexpected error recording memory:', err);
            return null;
        }
    }

    /**
     * Update the outcome of a memory record
     * Usually called when execution finishes or trade settles.
     * We look up by trade_id or we need to pass memory_id. 
     * Since execution happens AFTER memory creation, we might not have memory_id in ExecutionCore comfortably 
     * without passing it through. 
     * STRATEGY: 
     * 1. recordDecision returns UUID.
     * 2. ExecutionCore receives this UUID (via risk check meta?).
     * 3. ExecutionCore updates outcome using UUID.
     * 
     * ALTERNATIVE (Looser coupling):
     * Update by `trade_id` if we stored `trade_id` in the memory record?
     * But `trade_id` is created AFTER decision. 
     * So we need to UPDATE the memory record with `trade_id` and `outcome` later.
     */
    async updateOutcome(memoryId: string, outcome: OutcomeUpdate): Promise<void> {
        if (!this.enabled || !this.supabase) return;

        try {
            const updatePayload: any = {
                outcome: {
                    result: outcome.result,
                    pnl: outcome.pnl,
                    settled_at: outcome.settled_at
                }
            };

            if (outcome.trade_id) {
                updatePayload.trade_id = outcome.trade_id;
            }

            const { error } = await this.supabase
                .from('memories')
                .update(updatePayload)
                .eq('id', memoryId);

            if (error) {
                console.error(`[MemoryService] Failed to update outcome for memory ${memoryId}:`, error.message);
            }
        } catch (err) {
            console.error(`[MemoryService] Error updating outcome ${memoryId}:`, err);
        }
    }

    /**
     * Phase 9: Immutable Event Logging
     * Writes to `trade_memory_events` table which enforces NO UPDATES.
     * Should be called when the event cycle is COMPLETE (e.g. after settlement or rejection).
     */
    async finalizeEvent(data: ImmutableMemoryEvent): Promise<void> {
        if (!this.enabled || !this.supabase) return;

        try {
            const { error } = await this.supabase
                .from('trade_memory_events')
                .insert(data);

            if (error) {
                console.error('[MemoryService] Failed to finalize immutable event:', error.message);
            } else {
                console.log(`[MemoryService] Immutable event finalized for ${data.market} (${data.result})`);
            }
        } catch (err) {
            console.error('[MemoryService] Error finalizing immutable event:', err);
        }
    }

    /**
     * Phase 9 Day 3: Capture Hook
     * Safe, fire-and-forget wrapper for finalizeEvent.
     * Guarantees NO exceptions thrown upstream.
     */
    capture(data: ImmutableMemoryEvent): void {
        // Execute async without awaiting to be non-blocking
        this.finalizeEvent(data).catch(err => {
            console.error('[MemoryService] Critical Capture Failure (Safe Handled):', err);
        });
    }
}

export interface ImmutableMemoryEvent {
    market: string;
    features: any;
    signal: any;
    ai_confidence?: number;
    regime?: string;
    decision: 'EXECUTED' | 'BLOCKED';
    result: 'WIN' | 'LOSS' | 'NO_TRADE';
    pnl?: number;
}

// Export singleton
export const memoryService = new MemoryService();
