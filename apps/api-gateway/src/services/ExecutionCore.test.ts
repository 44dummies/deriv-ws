
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executionCore } from './ExecutionCore.js';
import { userService } from './UserService.js';
import { DerivWSClient } from './DerivWSClient.js';
import { marketDataService } from './MarketDataService.js';

// Mock Dependencies
vi.mock('./UserService.js', () => ({
    userService: {
        getDerivToken: vi.fn()
    }
}));

// Mock DerivWSClient Class
// We need to mock the *instance* methods
const mockAuthorize = vi.fn();
const mockBuy = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock('./DerivWSClient.js', () => {
    return {
        DerivWSClient: vi.fn().mockImplementation(() => ({
            connect: mockConnect,
            authorize: mockAuthorize,
            buyContract: mockBuy,
            disconnect: mockDisconnect,
            subscribe: mockSubscribe,
            on: mockOn,
            off: mockOff,
            isConnected: () => true
        }))
    };
});

// Mock MarketDataService for price checks (optional but good practice)
vi.mock('./MarketDataService.js', () => ({
    marketDataService: {
        getLastTicks: vi.fn().mockReturnValue([{ quote: 100 }])
    }
}));

describe('ExecutionCore Secure Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset ExecutionCore state if needed (e.g. processed keys)
        (executionCore as any).processedKeys.clear();
    });

    it('should execute trade successfully with valid token', async () => {
        // 1. Mock Encrypted Token retrieval
        vi.mocked(userService.getDerivToken).mockResolvedValue('mock_decrypted_token');

        // 2. Mock Deriv Auth & Buy Success
        mockAuthorize.mockResolvedValue(true);
        mockBuy.mockResolvedValue({
            contract_id: 12345,
            longcode: 'Win Payout'
        });

        // 3. Trigger Trade
        const tradeRequest = {
            userId: 'user-1',
            symbol: 'R_100',
            contractType: 'CALL',
            amount: 10,
            signalId: 'sig-1'
        };

        const result = await executionCore.executeTrade(tradeRequest);

        // 4. Verification
        expect(result.status).toBe('SUCCESS');
        expect(result.metadata_json.contract_id).toBe(12345);

        // Verify Strict Isolation Flow
        expect(userService.getDerivToken).toHaveBeenCalledWith('user-1');
        expect(mockConnect).toHaveBeenCalled();
        expect(mockAuthorize).toHaveBeenCalledWith('mock_decrypted_token');
        expect(mockBuy).toHaveBeenCalled();
        expect(mockDisconnect).toHaveBeenCalled(); // MUST disconnect after trade
    });

    it('should fail immediately if user has no token', async () => {
        // 1. Mock missing token
        vi.mocked(userService.getDerivToken).mockResolvedValue(null);

        const tradeRequest = {
            userId: 'user-no-token',
            symbol: 'R_100',
            contractType: 'PUT',
            amount: 10,
            signalId: 'sig-2'
        };

        const result = await executionCore.executeTrade(tradeRequest);

        expect(result.status).toBe('FAILED');
        expect(result.metadata_json.reason).toMatch(/User not authorized for trading/);

        // Should NOT try to connect to Deriv
        expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should fail if Deriv Authorization fails', async () => {
        vi.mocked(userService.getDerivToken).mockResolvedValue('invalid_token');

        // Mock Auth Failure
        mockAuthorize.mockRejectedValue(new Error('Invalid Token'));

        const tradeRequest = {
            userId: 'user-auth-fail',
            symbol: 'R_100',
            contractType: 'CALL',
            amount: 10,
            signalId: 'sig-3'
        };

        const result = await executionCore.executeTrade(tradeRequest);

        expect(result.status).toBe('FAILED');
        expect(result.metadata_json.reason).toMatch(/Execution Error/);

        // Must still disconnect cleanup
        expect(mockDisconnect).toHaveBeenCalled();
    });
});
