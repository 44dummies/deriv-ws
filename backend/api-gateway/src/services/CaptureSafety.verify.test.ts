
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'eventemitter3';

// 1. Mock MemoryService
vi.mock('./MemoryService.js', () => ({
    memoryService: {
        updateOutcome: vi.fn(),
        capture: vi.fn(),
        recordDecision: vi.fn().mockResolvedValue('mem-123')
    }
}));

// 2. Mock UserService
vi.mock('./UserService.js', () => ({
    UserService: {
        getDerivToken: vi.fn().mockResolvedValue('mock-deriv-token')
    }
}));

// Mock Redis
vi.mock('ioredis', () => {
    const Redis = vi.fn();
    Redis.prototype.set = vi.fn().mockResolvedValue('OK');
    return { Redis };
});

// 3. Mock DerivWSClient
vi.mock('./DerivWSClient.js', async () => {
    const { EventEmitter } = await import('eventemitter3');
    class MockDerivWSClient extends EventEmitter {
        connect() { setTimeout(() => this.emit('connected'), 1); }
        disconnect() { }
        async authorize() { return true; }
        async buyContract() {
            return {
                transaction_id: 'tx-1',
                contract_id: 100,
                buy_price: 10
            };
        }
        async monitorContract(cid: any) {
            // Trigger settlement immediately
            setTimeout(() => {
                this.emit('settled', cid, 'win', 5);
            }, 10);
        }
    }
    return { DerivWSClient: MockDerivWSClient };
});

// Import subject and mocks
import { executionCore } from './ExecutionCore.js';
import { memoryService } from './MemoryService.js';

describe('Phase 9 Day 3: Zero Side Effects Verification', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should continue execution even if memory capture FAILS', async () => {
        // Mock capture to throw error synchronously
        (memoryService.capture as any).mockImplementation(() => {
            throw new Error('DB EXPLOSION');
        });

        const riskCheck = {
            userId: 'user-1',
            sessionId: 'sess-1',
            result: 'APPROVED',
            proposedTrade: {
                market: 'R_SAFE',
                type: 'CALL',
                metadata: { technicals: { b: 1 } },
                timestamp: 'now' // needed for idempotency key
            },
            memoryId: 'mem-1'
        };

        const execPromise = new Promise((resolve) => {
            executionCore.once('TRADE_EXECUTED', (res) => {
                // Wait a bit for settlement logic to trigger and complete
                setTimeout(resolve, 100);
            });
        });

        // Trigger (cast to any to access private-ish handler if public not available, 
        // but handleApprovedTrade is private. executionCore listens to RiskGuard.
        // We can emit event on RiskGuard IF we imported it, or just call private method via any)
        await (executionCore as any).handleApprovedTrade(riskCheck);

        // Await completion signal
        await execPromise;

        // Assertions
        expect(memoryService.updateOutcome).toHaveBeenCalled(); // Operational update
        expect(memoryService.capture).toHaveBeenCalled(); // Capture called

        console.log('Test Passed: Execution flow finished without crash despite DB EXPLOSION');
    });
});
