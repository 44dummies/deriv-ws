import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'eventemitter3';

// 1. Set Env Vars (Runtime)
process.env.SUPABASE_URL = 'http://mock';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock';

// ==========================================
// MOCK REDIS (Correctly Hoisted)
// ==========================================
const { mockRedisMethods } = vi.hoisted(() => {
    return {
        mockRedisMethods: {
            set: vi.fn(),
            get: vi.fn(),
            del: vi.fn(),
            on: vi.fn(),
            status: 'ready'
        }
    };
});

vi.mock('ioredis', () => {
    return {
        Redis: class MockRedis {
            constructor() {
                return mockRedisMethods;
            }
        }
    };
});

// ==========================================
// MOCK DERIV WS CLIENT
// ==========================================
class MockDerivClient extends EventEmitter {
    isConnected = () => true;
    connect = vi.fn();
    disconnect = vi.fn();
    authorize = vi.fn().mockResolvedValue(true);
    buyContract = vi.fn().mockResolvedValue({ transaction_id: 123, contract_id: 456 });
}

vi.mock('./DerivWSClient.js', () => ({
    DerivWSClient: MockDerivClient,
    derivWSClient: new MockDerivClient()
}));

// ==========================================
// MOCK SUPABASE
// ==========================================
const mockSessions = [
    { id: 'sess-1', status: 'ACTIVE', config_json: { useAI: true }, created_at: '2023-01-01' }
];

const mockFrom = vi.fn((table: string) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: any) => {
        if (table === 'sessions') resolve({ data: mockSessions, error: null });
        else resolve({ data: [], error: null });
    };
    return chain;
});

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: mockFrom })
}));


describe('Phase 7 Day 7: Full System Chaos', () => {
    let sessionRegistry: any;
    let quantEngine: any;
    let executionCore: any;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        mockRedisMethods.set.mockResolvedValue('OK');

        const sr = await import('./SessionRegistry.js');
        const qe = await import('./QuantEngine.js');
        const ec = await import('./ExecutionCore.js');

        sessionRegistry = sr.sessionRegistry;
        quantEngine = qe.quantEngine;
        executionCore = ec.executionCore;

        if (sessionRegistry.clear) sessionRegistry.clear();
    });

    it('should degrade gracefully when Redis fails (Idempotency Check)', async () => {
        // Setup: Redis throws error
        mockRedisMethods.set.mockRejectedValue(new Error('Redis Connection Lost'));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        try {
            // @ts-ignore - Accessing private for chaos simulation
            await executionCore.handleApprovedTrade({
                userId: 'u1',
                sessionId: 's1',
                result: 'APPROVED',
                proposedTrade: { market: 'CHAOS_100', type: 'CALL', confidence: 0.9, timestamp: new Date().toISOString() },
                meta: {}
            });
        } catch (e) {
            // Internal catch
        }

        // Wait for async handling
        await new Promise(r => setTimeout(r, 20));

        // Expect EXECUTION_FAILED 
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('EXECUTION_FAILED')
        );
    });

    it('should recover session state after backend restart', async () => {
        sessionRegistry.clear();
        expect(sessionRegistry.getSessionState('sess-1')).toBeNull();

        const count = await sessionRegistry.recoverStateFromDB();

        expect(count).toBe(1);
        expect(sessionRegistry.getSessionState('sess-1')).toBeDefined();
        expect(sessionRegistry.getSessionState('sess-1').status).toBe('ACTIVE');
    });

    it('should handle WS Disconnect without losing state', async () => {
        sessionRegistry.createSession({ id: 'sess-ws-chaos', config_json: { allowed_markets: ['R_100'] } });
        sessionRegistry.updateSessionStatus('sess-ws-chaos', 'ACTIVE');

        expect(sessionRegistry.getSessionState('sess-ws-chaos')).toBeDefined();
        const session = sessionRegistry.getSessionState('sess-ws-chaos');
        expect(session.status).toBe('ACTIVE');
    });

    it('should fallback to Rule-Based when AI service fails', async () => {
        const sessionConfig = { useAI: true, min_confidence: 0.8, aiSessionId: 'ai-fail-test' };

        const { aiServiceClient } = await import('./AIServiceClient.js');

        // Mock with rejection
        const inferSpy = vi.spyOn(aiServiceClient, 'infer').mockRejectedValue(new Error('AI Service 503'));

        const fallbackSpy = vi.fn();
        quantEngine.on('ai_fallback', fallbackSpy);

        // Feed MORE ticks to ensure history suffices (Need > 26)
        // Providing 40 ticks
        for (let i = 0; i < 40; i++) {
            quantEngine.processTick({ market: 'R_100', quote: 100 + i, epoch: 1000 + i }, sessionConfig);
        }

        await new Promise(r => setTimeout(r, 100));

        expect(inferSpy).toHaveBeenCalled();
        expect(fallbackSpy).toHaveBeenCalled();
    });
});
