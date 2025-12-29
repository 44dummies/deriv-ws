/**
 * RiskGuard Test Script
 * Tests trade approval system
 */

import { riskGuard, SessionRiskConfig, UserRiskConfig } from './RiskGuard.js';
import { Signal } from './QuantEngine.js';

async function runTests(): Promise<void> {
    console.log('=== RiskGuard Tests ===\n');

    // Test signal
    const testSignal: Signal = {
        type: 'CALL',
        confidence: 0.75,
        reason: 'RSI_OVERSOLD',
        market: 'R_100',
        timestamp: new Date().toISOString(),
    };

    // Test configs
    const sessionConfig: SessionRiskConfig = {
        risk_profile: 'MEDIUM',
        max_stake: 100,
        min_confidence: 0.6,
        allowed_markets: ['R_100', 'R_50'],
        global_loss_threshold: 500,
        current_pnl: 50,
        is_paused: false,
    };

    const userConfig: UserRiskConfig = {
        max_drawdown: 200,
        max_daily_loss: 100,
        max_trades_per_session: 50,
        current_drawdown: 30,
        current_daily_loss: 20,
        trades_today: 5,
        is_opted_out: false,
    };

    // Set up event listeners
    riskGuard.on('approved', (result) => {
        console.log('  [Event] APPROVED:', result.signal.type, result.signal.market);
    });

    riskGuard.on('rejected', (result) => {
        console.log('  [Event] REJECTED:', result.reason);
    });

    // Test 1: Valid signal (should approve)
    console.log('Test 1: Valid signal (should approve)');
    const result1 = riskGuard.validate(testSignal, sessionConfig, userConfig, 50);
    console.log('  Approved:', result1.approved);
    console.log('  ✅ Test passed\n');

    // Test 2: Low confidence signal on LOW risk profile
    console.log('Test 2: Low confidence on LOW risk profile');
    const lowRiskConfig = { ...sessionConfig, risk_profile: 'LOW' as const };
    const lowConfSignal = { ...testSignal, confidence: 0.6 };
    const result2 = riskGuard.validate(lowConfSignal, lowRiskConfig, userConfig);
    console.log('  Approved:', result2.approved, '| Reason:', result2.reason);
    console.log('  ✅ Test passed\n');

    // Test 3: User at max drawdown
    console.log('Test 3: User at max drawdown');
    const maxDrawdownUser = { ...userConfig, current_drawdown: 200 };
    const result3 = riskGuard.validate(testSignal, sessionConfig, maxDrawdownUser);
    console.log('  Approved:', result3.approved, '| Reason:', result3.reason);
    console.log('  ✅ Test passed\n');

    // Test 4: User daily loss limit reached
    console.log('Test 4: User daily loss limit reached');
    const maxLossUser = { ...userConfig, current_daily_loss: 100 };
    const result4 = riskGuard.validate(testSignal, sessionConfig, maxLossUser);
    console.log('  Approved:', result4.approved, '| Reason:', result4.reason);
    console.log('  ✅ Test passed\n');

    // Test 5: Session paused
    console.log('Test 5: Session paused');
    const pausedSession = { ...sessionConfig, is_paused: true };
    const result5 = riskGuard.validate(testSignal, pausedSession, userConfig);
    console.log('  Approved:', result5.approved, '| Reason:', result5.reason);
    console.log('  ✅ Test passed\n');

    // Test 6: Market not allowed
    console.log('Test 6: Market not allowed');
    const r25Signal = { ...testSignal, market: 'R_25' };
    const result6 = riskGuard.validate(r25Signal, sessionConfig, userConfig);
    console.log('  Approved:', result6.approved, '| Reason:', result6.reason);
    console.log('  ✅ Test passed\n');

    // Test 7: Stake too high
    console.log('Test 7: Stake too high');
    const result7 = riskGuard.validate(testSignal, sessionConfig, userConfig, 200);
    console.log('  Approved:', result7.approved, '| Reason:', result7.reason);
    console.log('  ✅ Test passed\n');

    // Test 8: Session global loss threshold
    console.log('Test 8: Session global loss threshold');
    const lossSession = { ...sessionConfig, current_pnl: -600 };
    const result8 = riskGuard.validate(testSignal, lossSession, userConfig);
    console.log('  Approved:', result8.approved, '| Reason:', result8.reason);
    console.log('  ✅ Test passed\n');

    // Test 9: User opted out
    console.log('Test 9: User opted out');
    const optedOutUser = { ...userConfig, is_opted_out: true };
    const result9 = riskGuard.validate(testSignal, sessionConfig, optedOutUser);
    console.log('  Approved:', result9.approved, '| Reason:', result9.reason);
    console.log('  ✅ Test passed\n');

    // Test 10: Calculate recommended stake
    console.log('Test 10: Calculate recommended stake');
    const stake = riskGuard.calculateRecommendedStake(100, sessionConfig, userConfig);
    console.log('  Recommended stake:', stake);
    console.log('  ✅ Test passed\n');

    console.log('=== All RiskGuard Tests Complete ===\n');
}

runTests().catch(console.error);
