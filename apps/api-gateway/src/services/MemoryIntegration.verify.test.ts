import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { quantEngine, Signal } from './QuantEngine.js';
import { riskGuard } from './RiskGuard.js';
import { executionCore, TradeResult } from './ExecutionCore.js';
import { memoryService } from './MemoryService.js';
import { sessionRegistry } from './SessionRegistry.js';
import { UserService } from './UserService.js';

// Mocks
vi.mock('ioredis', () => {
    return {
        Redis: class MockRedis {
            async set() { return 'OK'; }
            on() { }
            disconnect() { }
        }
    };
});

// Mock Supabase to avoid real connection attempts inside MemoryService
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: () => ({
            insert: () => ({ select: () => ({ single: () => ({ data: { id: 'mem-mock' }, error: null }) }) }),
            update: () => ({ eq: () => ({ error: null }) })
        })
    })
}));

describe('Phase 8: Memory Integration Flow', () => {
    let memoryRecordSpy: any;
    let memoryUpdateSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        memoryRecordSpy = vi.spyOn(memoryService, 'recordDecision');
        memoryUpdateSpy = vi.spyOn(memoryService, 'updateOutcome');

        // Setup Active Session for RiskGuard
        vi.spyOn(sessionRegistry, 'getActiveSessions').mockReturnValue([{
            id: 'sess-1',
            config_json: { allowed_markets: ['R_100'], global_loss_threshold: 1000 },
            participants: new Map([['user-1', { pnl: 0, positions: [] }]])
        } as any]);

        vi.spyOn(sessionRegistry, 'getSessionState').mockReturnValue({
            id: 'sess-1',
            config_json: { allowed_markets: ['R_100'] },
            participants: new Map([['user-1', { pnl: 0, positions: [] }]])
        } as any);

        // Mock ExecutionCore internals to avoid real Trading
        // We can just spy on executeTrade or mock DerivWSClient
        vi.spyOn(UserService, 'getDerivToken').mockResolvedValue('mock-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should record decision in RiskGuard when Signal emitted', async () => {
        const signal: Signal = {
            type: 'CALL',
            confidence: 0.9,
            reason: 'RSI_OVERSOLD',
            market: 'R_100',
            timestamp: new Date().toISOString(),
            expiry: new Date().toISOString(),
            metadata: {
                technicals: { rsi: 20 } as any
            }
        };

        // Emit Signal
        quantEngine.emit('signal', signal);

        // Wait a bit for event loop
        await new Promise(r => setTimeout(r, 10));

        // Expect recordDecision to be called
        expect(memoryRecordSpy).toHaveBeenCalled();
        const callArgs = memoryRecordSpy.mock.calls[0][0];
        expect(callArgs.market).toBe('R_100');
        expect(callArgs.technicals.rsi).toBe(20);
        expect(callArgs.id).toBeDefined(); // UUID generated
    });

    it('should update outcome in ExecutionCore when Trade executed', async () => {
        // We manually trigger the 'risk_check_completed' event that ExecutionCore listens to
        // We include a memoryId to simulate RiskGuard having recorded it
        const memId = 'mem-test-uuid';

        // Spy on internal executeTrade to mock it out (or let it fail safely)
        // Since we mocked UserService.getDerivToken, it might try to connect DerivWSClient
        // Let's mock DerivWSClient too
        const mockConnect = vi.fn();
        const mockBuy = vi.fn().mockResolvedValue({
            transaction_id: 'trade-123',
            contract_id: 999,
            buy_price: 100
        });

        // @ts-ignore
        vi.mock('./DerivWSClient.js', () => ({
            DerivWSClient: class MockDerivWSClient {
                on(e: string, cb: any) { }
                connect() { }
                async authorize() { return true; }
                async monitorContract(contractId: any) {
                    // Simulate settlement after delay
                    setTimeout(() => {
                        // We need to trigger the 'settled' listener
                        // But 'once' was registered on THIS instance.
                        // So we need to store listeners.
                        if (this.settledCb) {
                            this.settledCb(contractId, 'win', 50);
                        }
                    }, 50);
                }

                private settledCb: any;

                once(e: string, cb: any) {
                    if (e === 'connected') {
                        setTimeout(cb, 10);
                    } else if (e === 'settled') {
                        this.settledCb = cb;
                    }
                }
                async buyContract() {
                    return {
                        transaction_id: 'trade-123',
                        contract_id: 999,
                        buy_price: 100
                    };
                }
                disconnect() { }
            }
        }));

        // ExecutionCore needs to be re-initialized or we rely on the singleton listening
        // Ideally we'd re-import to pick up mocks, but singletons are sticky.
        // We will just emit the event riskGuard emits.

        // Spy on private methods
        const execSpy = vi.spyOn(executionCore as any, 'executeTrade');
        const handleSpy = vi.spyOn(executionCore as any, 'handleApprovedTrade');

        riskGuard.emit('risk_check_completed', {
            userId: 'user-1',
            sessionId: 'sess-1',
            result: 'APPROVED',
            proposedTrade: {
                market: 'R_100',
                type: 'CALL',
                confidence: 0.9,
                timestamp: new Date().toISOString()
            } as any,
            memoryId: memId
        });

        // Wait longer for async execution
        await new Promise(r => setTimeout(r, 200));

        // Debug assertions
        if (handleSpy.mock.calls.length === 0) {
            console.error('handleApprovedTrade WAS NOT CALLED. Listener issue?');
            console.log('Listeners on risk_check_completed:', riskGuard.listeners('risk_check_completed').length);
        } else if (execSpy.mock.calls.length === 0) {
            console.error('executeTrade WAS NOT CALLED. Blocked logic?');
        }

        // Expect updateOutcome to be called
        // Expect SUBMITTED
        expect(memoryUpdateSpy).toHaveBeenCalledWith(memId, expect.objectContaining({
            result: 'SUBMITTED',
            trade_id: 'trade-123'
        }));

        // Now verify SETTLEMENT
        // We know ExecutionCore is waiting for 'settled' event
        // We need to access the client instance. 
        // Since we mocked the class constructor, we can't easily grab the instance executionCore created.
        // BUT, we can simplify: The logic is tested if we verify 'updateOutcome' is called TWICE.
        // The second time should be WIN/LOSS.
        // However, our mock doesn't emit 'settled' yet.

        // Wait for the settlement logic to timeout or we need to improve the mock to emit 'settled' 
        // if monitorContract is called.

    });
});
