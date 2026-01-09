/**
 * TraderMind ComplianceService
 * Generates audit reports for regulatory and operational compliance.
 * PRD Phase 7 Requirement.
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from '../utils/logger.js';

export interface ComplianceReport {
    generatedAt: string;
    totalTrades: number;
    winRate: number;
    avgExecutionLatency: number;
    rejectionStats: Record<string, number>;
    riskViolations: number;
}

export class ComplianceService {
    private supabase;

    constructor() {
        const supabaseUrl = process.env['SUPABASE_URL'];
        const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

        if (!supabaseUrl || !supabaseKey) {
            logger.warn('[ComplianceService] Missing Supabase credentials.');
        } else {
            this.supabase = createClient(supabaseUrl, supabaseKey);
        }
    }

    async generateSessionReport(sessionId: string): Promise<ComplianceReport> {
        if (!this.supabase) throw new Error('Service unavailable');

        // Fetch trades
        const { data: trades, error } = await this.supabase
            .from('trades')
            .select('*')
            .eq('session_id', sessionId);

        if (error) throw new Error(error.message);

        const total = trades.length;
        const wins = trades.filter(t => t.profit > 0).length;

        // Calculate latency from metadata (assuming execution_duration_ms is logged)
        let totalLatency = 0;
        let latencyCount = 0;
        trades.forEach(t => {
            if (t.metadata_json?.latency_ms) {
                totalLatency += t.metadata_json.latency_ms;
                latencyCount++;
            }
        });

        // Mock Rejection Stats (Ideally this comes from a 'signals' or 'rejections' table if we persisted rejected signals)
        // Since we currently only log rejections in console/memory (RiskGuard), we might only be able to report on *logged* failures if we add a table.
        // For now, we'll return a placeholder for rejections until we persist 'risk_check_failures' in DB.

        return {
            generatedAt: new Date().toISOString(),
            totalTrades: total,
            winRate: total > 0 ? (wins / total) : 0,
            avgExecutionLatency: latencyCount > 0 ? (totalLatency / latencyCount) : 0,
            rejectionStats: {}, // TODO: Persist rejections to DB to query here
            riskViolations: 0
        };
    }
}

export const complianceService = new ComplianceService();
