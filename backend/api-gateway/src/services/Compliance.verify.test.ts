import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Set Env Vars (Runtime)
process.env.SUPABASE_URL = 'http://mock';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';

// 2. Mock Setup
const mockSessions = [{ id: 'sess-123', status: 'ACTIVE', config_json: '{}', created_at: '2023-01-01' }];
const mockParticipants = [{ user_id: 'u1', status: 'ACTIVE', pnl: 0 }];
const mockTrades = [
    { id: 't1', created_at: '2023-01-01T10:00:00Z', status: 'COMPLETED', profit: 10, metadata_json: { latency_ms: 100 } },
    { id: 't2', created_at: '2023-01-01T10:05:00Z', status: 'FAILED', profit: 0 }
];

const mockFrom = vi.fn((table: string) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any) => {
        let data: any = [];
        if (table === 'sessions') data = mockSessions;
        else if (table === 'participants') data = mockParticipants;
        else if (table === 'trades') data = mockTrades;
        resolve({ data, error: null });
    };
    return chain;
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: mockFrom })
}));

describe('Phase 7 Compliance Verification', () => {
    let sessionRegistry: any;
    let tradeReplayService: any;
    let complianceService: any;
    let derivWSClient: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Dynamic imports to ensure process.env is seen
        const sr = await import('./SessionRegistry.js');
        const trs = await import('./TradeReplayService.js');
        const cs = await import('./ComplianceService.js');
        const dws = await import('./DerivWSClient.js');

        sessionRegistry = sr.sessionRegistry;
        tradeReplayService = trs.tradeReplayService;
        complianceService = cs.complianceService;
        derivWSClient = dws.derivWSClient;

        // Reset singleton if possible, or just clear data
        if (sessionRegistry.clear) sessionRegistry.clear();

        // Re-instantiate services if they cached env vars (they do in constructor)
        // Since we import *after* setting env, the module-level instantiation should see it.
        // Wait, module-level instantiation happens on *first* import.
        // If they were imported before by other tests or vitest cache, it might be stale.
        // Vitest usually isolates test files.
    });

    it('should have sellContract and cancelContract in DerivWSClient', () => {
        expect(typeof derivWSClient.sellContract).toBe('function');
        expect(typeof derivWSClient.cancelContract).toBe('function');
    });

    it('should recover state from DB in SessionRegistry', async () => {
        const count = await sessionRegistry.recoverStateFromDB();
        expect(mockFrom).toHaveBeenCalledWith('sessions');
        expect(mockFrom).toHaveBeenCalledWith('participants');
        expect(count).toBe(1);
    });

    it('should generate replay timeline', async () => {
        const replay = await tradeReplayService.getSessionReplay('sess-123');
        expect(mockFrom).toHaveBeenCalledWith('trades');
        expect(replay.length).toBe(2);
    });

    it('should generate compliance report', async () => {
        const report = await complianceService.generateSessionReport('sess-123');
        expect(mockFrom).toHaveBeenCalledWith('trades');
        expect(report.totalTrades).toBe(2);
    });
});
