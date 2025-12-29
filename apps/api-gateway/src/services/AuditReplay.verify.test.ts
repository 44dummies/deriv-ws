import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Set Env Vars (Runtime)
process.env.SUPABASE_URL = 'http://mock';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';

// 5 Historical Mocks representing different lifecycle paths
const mockTrades = [
    // ... [Same mock data as before] ...
    {
        id: 't-win',
        session_id: 'sess-audit',
        created_at: '2023-10-01T10:00:00Z',
        status: 'COMPLETED',
        result: 'WIN',
        profit: 50,
        metadata_json: {
            signal: { type: 'CALL', market: 'R_100', timestamp: '2023-10-01T10:00:00Z' },
            ai_analysis: { confidence: 0.95, regime: 'TRENDING', model: 'xgb_v1' },
            risk_check: { approved: true, risk_score: 0.1 },
            execution: { ticket: '12345', duration_ms: 120 }
        }
    },
    {
        id: 't-risk-fail',
        session_id: 'sess-audit',
        created_at: '2023-10-01T10:05:00Z',
        status: 'FAILED',
        result: 'REJECTED',
        profit: 0,
        metadata_json: {
            signal: { type: 'PUT', market: 'R_100', timestamp: '2023-10-01T10:05:00Z' },
            ai_analysis: { confidence: 0.88, regime: 'VOLATILE', model: 'xgb_v1' },
            risk_check: { approved: false, reason: 'DAILY_LOSS_LIMIT_HIT' },
        }
    },
    {
        id: 't-ai-fail',
        session_id: 'sess-audit',
        created_at: '2023-10-01T10:10:00Z',
        status: 'FAILED',
        result: 'SKIPPED',
        profit: 0,
        metadata_json: {
            signal: { type: 'CALL', market: 'R_100' },
            ai_analysis: { confidence: 0.42, reason: 'LOW_CONFIDENCE' },
        }
    },
    {
        id: 't-exec-fail',
        session_id: 'sess-audit',
        created_at: '2023-10-01T10:15:00Z',
        status: 'FAILED',
        result: 'ERROR',
        profit: 0,
        metadata_json: {
            signal: { type: 'PUT', market: 'R_100' },
            ai_analysis: { confidence: 0.91 },
            risk_check: { approved: true },
            execution: { error: 'Network socket hang up', attempt: 1 }
        }
    },
    {
        id: 't-scratch',
        session_id: 'sess-audit',
        created_at: '2023-10-01T10:20:00Z',
        status: 'COMPLETED',
        result: 'BREAKEVEN',
        profit: 0,
        metadata_json: {
            signal: { type: 'CALL', market: 'R_50' },
            ai_analysis: { confidence: 0.75, regime: 'RANGING' },
            execution: { ticket: '12350', profit: 0 }
        }
    }
];

// Helper to make chain methods return themselves
const makeChainable = (chain: any) => {
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    return chain;
};

const mockFrom = vi.fn((table: string) => {
    const chain: any = {};
    // Need to initialize mock methods
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);

    chain.then = (resolve: any) => {
        if (table === 'trades') {
            resolve({ data: mockTrades, error: null });
        } else {
            resolve({ data: [], error: null });
        }
    };
    return chain;
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: mockFrom })
}));

describe('Phase 7 Day 5: Audit Trail & Replay Validation', () => {
    let tradeReplayService: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Dynamic import
        const mod = await import('./TradeReplayService.js');
        tradeReplayService = mod.tradeReplayService;
    });

    it('should reconstruct lifecycle for 5 distinct execution paths', async () => {
        const replay = await tradeReplayService.getSessionReplay('sess-audit');

        expect(replay.length).toBe(5);

        // 1. CHECK VALID WIN
        const win = replay.find((e: any) => e.data.tradeId === 't-win');
        expect(win).toBeDefined();
        expect(win?.data.metadata.ai_analysis.confidence).toBe(0.95);
        expect(win?.data.metadata.risk_check.approved).toBe(true);
        expect(win?.data.metadata.execution.ticket).toBe('12345');

        // 2. CHECK RISK FAILURE
        const riskFail = replay.find((e: any) => e.data.tradeId === 't-risk-fail');
        expect(riskFail).toBeDefined();
        expect(riskFail?.type).toBe('TRADE_FAILED');
        expect(riskFail?.data.metadata.risk_check.approved).toBe(false);
        expect(riskFail?.data.metadata.risk_check.reason).toBe('DAILY_LOSS_LIMIT_HIT');

        // 3. CHECK AI REJECTION
        const aiFail = replay.find((e: any) => e.data.tradeId === 't-ai-fail');
        expect(aiFail).toBeDefined();
        expect(aiFail?.data.metadata.ai_analysis.confidence).toBe(0.42);

        // 4. CHECK EXECUTION FAILURE
        const execFail = replay.find((e: any) => e.data.tradeId === 't-exec-fail');
        expect(execFail).toBeDefined();
        expect(execFail?.data.metadata.execution.error).toContain('Network');

        // 5. CHECK BREAKEVEN
        const scratch = replay.find((e: any) => e.data.tradeId === 't-scratch');
        expect(scratch).toBeDefined();
        expect(scratch?.data.profit).toBe(0);
        expect(scratch?.type).toBe('TRADE_EXECUTED');
    });

    it('should prove input == output for all metadata fields', async () => {
        const replay = await tradeReplayService.getSessionReplay('sess-audit');

        // Deep equality check for the first item
        const original = mockTrades[0]!;
        const reconstructed = replay[0];

        expect(reconstructed.timestamp).toBe(original.created_at);
        expect(reconstructed.data.metadata).toEqual(original.metadata_json);
        expect(reconstructed.data.result).toBe(original.result);
    });
});
