
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executionCore } from './ExecutionCore.js';
import { UserService } from './UserService.js';

// Mock Dependencies
vi.mock('./UserService.js', () => ({
    UserService: {
        getDerivToken: vi.fn(),
        storeDerivToken: vi.fn()
    }
}));

// Mock DerivWSClient Class
const mockAuthorize = vi.fn();
const mockBuy = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockOnce = vi.fn();

vi.mock('./DerivWSClient.js', () => {
    return {
        DerivWSClient: vi.fn().mockImplementation(function () {
            return {
                connect: mockConnect,
                authorize: mockAuthorize,
                buyContract: mockBuy,
                disconnect: mockDisconnect,
                subscribe: mockSubscribe,
                on: mockOn,
                once: mockOnce,
                off: mockOff,
                isConnected: () => true
            };
        })
    };
});

// Mock MarketDataService
vi.mock('./MarketDataService.js', () => ({
    marketDataService: {
        getLastTicks: vi.fn().mockReturnValue([{ quote: 100 }])
    }
}));

describe('ExecutionCore Secure Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (executionCore as any).processedKeys.clear();

        // Setup default mock behavior for connect
        mockOnce.mockImplementation((event, cb) => {
            if (event === 'connected') cb();
            return this;
        });
    });

    it('should execute trade successfully with valid token', async () => {
        // 1. Mock Encrypted Token retrieval
        vi.mocked(UserService.getDerivToken).mockResolvedValue('mock_decrypted_token');

        // 2. Mock Deriv Auth & Buy Success
        mockAuthorize.mockResolvedValue(true);
        mockBuy.mockResolvedValue({
            contract_id: 12345,
            longcode: 'Win Payout',
            transaction_id: 999,
            buy_price: 10.5
        });

        // 3. Trigger Trade (Use proper RiskCheck structure)
        const riskCheck = {
            userId: 'user-1',
            sessionId: 'session-1',
            result: 'APPROVED',
            proposedTrade: {
                market: 'R_100',
                type: 'CALL',
                confidence: 0.9,
                timestamp: new Date().toISOString(),
                expiry: new Date().toISOString()
            }
        };

        // Call private method
        await (executionCore as any).executeTrade(riskCheck, 'key-1');

        // 4. Verification
        // Verify Strict Isolation Flow
        expect(UserService.getDerivToken).toHaveBeenCalledWith('user-1');
        expect(mockConnect).toHaveBeenCalled();
        expect(mockAuthorize).toHaveBeenCalledWith('mock_decrypted_token');
        expect(mockBuy).toHaveBeenCalled();
        expect(mockDisconnect).toHaveBeenCalled(); // MUST disconnect after trade
    });

    it('should fail immediately if user has no token', async () => {
        vi.mocked(UserService.getDerivToken).mockResolvedValue(null);

        const riskCheck = {
            userId: 'user-no-token',
            sessionId: 'session-1',
            result: 'APPROVED',
            proposedTrade: {
                market: 'R_100',
                type: 'PUT',
                confidence: 0.8,
                timestamp: new Date().toISOString(),
                expiry: new Date().toISOString()
            }
        };

        await (executionCore as any).executeTrade(riskCheck, 'key-2');

        // Should NOT try to connect to Deriv
        expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should fail if Deriv Authorization fails', async () => {
        vi.mocked(UserService.getDerivToken).mockResolvedValue('invalid_token');

        // Mock Auth Failure
        mockAuthorize.mockRejectedValue(new Error('Invalid Token'));

        const riskCheck = {
            userId: 'user-auth-fail',
            sessionId: 'session-1',
            result: 'APPROVED',
            proposedTrade: {
                market: 'R_100',
                type: 'CALL',
                confidence: 0.9,
                timestamp: new Date().toISOString(),
                expiry: new Date().toISOString()
            }
        };

        await (executionCore as any).executeTrade(riskCheck, 'key-3');

        // Must still disconnect cleanup
        expect(mockDisconnect).toHaveBeenCalled();
    });
});
