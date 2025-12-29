
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionCore } from './ExecutionCore.js';
import { UserService } from './UserService.js';
import { DerivWSClient } from './DerivWSClient.js';
import { RiskCheck } from './RiskGuard.js';

// 1. Mock External Dependencies
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: { admin: { getUserById: vi.fn() } }
    }))
}));

// Mutable Redis Mock using vi.hoisted to avoid ReferenceError
const { mockRedisSet } = vi.hoisted(() => {
    return { mockRedisSet: vi.fn().mockResolvedValue('OK') };
});

vi.mock('ioredis', () => {
    return {
        default: class MockRedis {
            set = mockRedisSet;
        }
    };
});

vi.mock('./UserService.js');

// 2. Setup Mutable Mock for DerivWSClient
let currentMockClient: any;

vi.mock('./DerivWSClient.js', () => {
    return {
        DerivWSClient: class MockDerivWSClient {
            constructor() {
                return currentMockClient;
            }
        }
    };
});

describe('ExecutionCore Failure Scenarios', () => {
    let core: ExecutionCore;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();

        // Reset Redis Mock Default
        mockRedisSet.mockReset();
        mockRedisSet.mockResolvedValue('OK'); // Default: Success (Not Duplicate)

        currentMockClient = {
            on: vi.fn(),
            once: vi.fn(),
            connect: vi.fn(),
            authorize: vi.fn(),
            buyContract: vi.fn(),
            disconnect: vi.fn(),
            emit: vi.fn()
        };

        core = new ExecutionCore();
        (UserService.getDerivToken as any).mockResolvedValue('valid-token');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const createRiskCheck = (userId: string, suffix = '1'): RiskCheck => ({
        userId,
        sessionId: 'session-1',
        result: 'APPROVED',
        stake: 10,
        approved_at: new Date().toISOString(),
        proposedTrade: {
            market: 'R_100',
            type: 'CALL',
            duration: 1,
            amount: 10,
            symbol: 'R_100',
            confidence: 0.9,
            timestamp: new Date().toISOString(),
            expiry: new Date().toISOString(),
            payout: 19
        },
        checks: {
            is_paused: true,
            global_loss: true,
            daily_loss: true,
            daily_trades: true,
            drawdown: true,
            market_open: true
        }
    });

    it('should handle Network Timeout during connection', async () => {
        vi.useFakeTimers();

        currentMockClient.connect.mockImplementation(() => {
            console.log('[TEST] Connect called (mock hang)');
        });

        const check = createRiskCheck('user-timeout');

        const promise = new Promise<any>(resolve => {
            core.once('TRADE_EXECUTED', resolve);
        });

        (core as any).handleApprovedTrade(check);

        await vi.advanceTimersByTimeAsync(6000);

        const result = await promise;
        expect(result.status).toBe('FAILED');
        expect(result.metadata_json.reason).toMatch(/Connection timeout/);
    }, 15000);

    it('should handle Authorization Failure', async () => {
        currentMockClient.once.mockImplementation((event: string, cb: Function) => {
            if (event === 'connected') cb();
            return currentMockClient;
        });

        currentMockClient.authorize.mockResolvedValue(false);

        const check = createRiskCheck('user-auth-fail');

        const promise = new Promise<any>(resolve => {
            core.once('TRADE_EXECUTED', resolve);
        });

        (core as any).handleApprovedTrade(check);

        const result = await promise;
        expect(result.status).toBe('FAILED');
        expect(result.metadata_json.reason).toMatch(/AUTHORIZATION_FAILED/);
    });

    it('should handle Proposal/Buy Rejection', async () => {
        currentMockClient.once.mockImplementation((event: string, cb: Function) => {
            if (event === 'connected') cb();
            return currentMockClient;
        });
        currentMockClient.authorize.mockResolvedValue(true);
        currentMockClient.buyContract.mockRejectedValue(new Error('Market is closed'));

        const check = createRiskCheck('user-buy-fail');

        const promise = new Promise<any>(resolve => {
            core.once('TRADE_EXECUTED', resolve);
        });

        (core as any).handleApprovedTrade(check);

        const result = await promise;
        expect(result.status).toBe('FAILED');
        expect(result.metadata_json.reason).toMatch(/Market is closed/);
    });

    it('should prevent Duplicate Execution (Idempotency)', async () => {
        currentMockClient.once.mockImplementation((event: string, cb: Function) => {
            if (event === 'connected') cb();
            return currentMockClient;
        });
        currentMockClient.authorize.mockResolvedValue(true);
        currentMockClient.buyContract.mockResolvedValue({
            transaction_id: 12345,
            buy_price: 10,
            contract_id: 999
        });

        // Mock Redis to simulated first success, then duplicate
        mockRedisSet
            .mockResolvedValueOnce('OK')  // First call: OK (New)
            .mockResolvedValueOnce(null); // Second call: null (Duplicate)

        const check = createRiskCheck('user-duplicate');

        const results: any[] = [];
        core.on('TRADE_EXECUTED', (r) => results.push(r));

        await (core as any).handleApprovedTrade(check);
        await (core as any).handleApprovedTrade(check); // Should return early

        // Wait short time for async processing of first call
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(results.length).toBe(1);
        expect(results[0].status).toBe('SUCCESS');
        expect(currentMockClient.buyContract).toHaveBeenCalledTimes(1);
    });
});
