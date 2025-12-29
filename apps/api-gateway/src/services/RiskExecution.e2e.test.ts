
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { quantEngine, Signal } from './QuantEngine.js';
import { riskGuard, RiskCheck } from './RiskGuard.js';
import { executionCore, TradeResult } from './ExecutionCore.js';
import { sessionRegistry, SessionState } from './SessionRegistry.js';

describe('RiskGuard + ExecutionCore E2E Pipeline', () => {
    // Capture events
    const tradeEvents: TradeResult[] = [];
    const riskEvents: RiskCheck[] = [];

    beforeEach(() => {
        // Reset Event Arrays
        tradeEvents.length = 0;
        riskEvents.length = 0;

        // Reset ExecutionCore State (processedKeys)
        (executionCore as any).processedKeys.clear();

        // Listeners
        const tradeSub = (res: TradeResult) => tradeEvents.push(res);
        const riskSub = (check: RiskCheck) => riskEvents.push(check);

        executionCore.on('TRADE_EXECUTED', tradeSub);
        riskGuard.on('risk_check_completed', riskSub);

        // Cleanup listeners after test
        return () => {
            executionCore.off('TRADE_EXECUTED', tradeSub);
            riskGuard.off('risk_check_completed', riskSub);
        };
    });

    it('should process a multi-user session with mixed outcomes correctly', async () => {
        // 1. Setup Mock Session
        const mockSession: SessionState = {
            id: 'session-e2e',
            status: 'RUNNING',
            config_json: {
                allowed_markets: ['R_100'],
                global_loss_threshold: 500
            },
            participants: new Map([
                ['user-clean', { user_id: 'user-clean', status: 'ACTIVE', joined_at: new Date().toISOString(), pnl: 0 }],
                ['user-risky', { user_id: 'user-risky', status: 'ACTIVE', joined_at: new Date().toISOString(), pnl: 0 }],
                ['fail-user', { user_id: 'fail-user', status: 'ACTIVE', joined_at: new Date().toISOString(), pnl: 0 }]
            ]),
            created_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            completed_at: null,
            admin_id: 'admin'
        };

        vi.spyOn(sessionRegistry, 'getActiveSessions').mockReturnValue([mockSession]);
        vi.spyOn(sessionRegistry, 'getSessionState').mockReturnValue(mockSession);

        // 2. Setup User Risk State Stubs
        (global as any)._TEST_USER_RISK_STATE = {
            'user-clean': {
                dailyLoss: 0,
                maxDailyLoss: 100,
                currentDrawdown: 0,
                maxDrawdown: 10,
                tradesToday: 0,
                maxTradesPerDay: 5
            },
            'user-risky': {
                dailyLoss: 150, // Exceeds limit (100)
                maxDailyLoss: 100,
                currentDrawdown: 5,
                maxDrawdown: 10,
                tradesToday: 6,
                maxTradesPerDay: 5
            },
            'fail-user': { // Passes risk, but fails execution
                dailyLoss: 0,
                maxDailyLoss: 100,
                currentDrawdown: 0,
                maxDrawdown: 10,
                tradesToday: 0,
                maxTradesPerDay: 5
            }
        };

        // 3. Emit Signal
        const signal: Signal = {
            type: 'CALL',
            market: 'R_100', // Allowed market
            confidence: 0.9,
            reason: 'RSI_OVERSOLD',
            timestamp: new Date().toISOString(),
            expiry: new Date().toISOString()
        };

        console.log('--- Emitting E2E Signal ---');
        quantEngine.emit('signal', signal);

        // Allow Event Loop to process
        await new Promise(resolve => setTimeout(resolve, 100));

        // 4. Verification

        console.log('Risk Events:', riskEvents.length);
        console.log('Trade Events:', tradeEvents.length);

        // A. Verify Risk Checks
        expect(riskEvents).toHaveLength(3);

        const cleanRisk = riskEvents.find(r => r.userId === 'user-clean');
        expect(cleanRisk).toBeDefined();
        expect(cleanRisk?.result).toBe('APPROVED');

        const riskyRisk = riskEvents.find(r => r.userId === 'user-risky');
        expect(riskyRisk).toBeDefined();
        expect(riskyRisk?.result).toBe('REJECTED');
        expect(riskyRisk?.reason).toMatch(/User Daily Loss Limit Exceeded/);

        const failUserRisk = riskEvents.find(r => r.userId === 'fail-user');
        expect(failUserRisk?.result).toBe('APPROVED');


        // B. Verify Execution Results.
        const cleanTrade = tradeEvents.find(t => t.userId === 'user-clean');
        expect(cleanTrade).toBeDefined();
        expect(cleanTrade?.status).toBe('SUCCESS');
        expect(cleanTrade?.profit).toBe(0);
        expect(cleanTrade?.metadata_json.entryPrice).toBeDefined();

        const riskyTrade = tradeEvents.find(t => t.userId === 'user-risky');
        expect(riskyTrade).toBeUndefined(); // Should not exist

        const failTrade = tradeEvents.find(t => t.userId === 'fail-user');
        expect(failTrade).toBeDefined();
        expect(failTrade?.status).toBe('FAILED');
        expect(failTrade?.metadata_json.reason).toMatch(/Simulated execution failure/);
    });

    it('should reject all users if Session Global Loss is exceeded', async () => {
        // 1. Setup Mock Session with High Loss
        const mockSession: SessionState = {
            id: 'session-loss',
            status: 'RUNNING',
            config_json: {
                allowed_markets: ['R_100'],
                global_loss_threshold: 500,
            },
            participants: new Map([
                ['user-clean', { user_id: 'user-clean', status: 'ACTIVE', joined_at: new Date().toISOString(), pnl: -600 }]
            ]),

            created_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            completed_at: null,
            admin_id: 'admin'
        };

        vi.spyOn(sessionRegistry, 'getActiveSessions').mockReturnValue([mockSession]);
        vi.spyOn(sessionRegistry, 'getSessionState').mockReturnValue(mockSession);

        (global as any)._TEST_USER_RISK_STATE = {
            'user-clean': { dailyLoss: 0, maxDailyLoss: 100, currentDrawdown: 0, maxDrawdown: 10, tradesToday: 0, maxTradesPerDay: 5 }
        };

        const signal: Signal = {
            type: 'PUT',
            market: 'R_100',
            confidence: 0.9,
            reason: 'MOMENTUM_SHIFT',
            timestamp: new Date().toISOString(),
            expiry: new Date().toISOString()
        };

        quantEngine.emit('signal', signal);
        await new Promise(resolve => setTimeout(resolve, 50));

        const riskCheck = riskEvents.find(r => r.userId === 'user-clean');
        // RiskGuard iterates map keys.
        expect(riskCheck?.result).toBe('REJECTED');
        expect(riskCheck?.reason).toMatch(/Session Global Loss Limit Hit/);
    });
});
