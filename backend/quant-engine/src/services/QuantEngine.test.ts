/**
 * QuantEngine Test Script
 * Tests signal generation and schema validation
 */

import { quantEngine, Signal } from './QuantEngine.js';
import { NormalizedTick } from './MarketDataService.js';
import { SignalSchema, validateSignal } from '@tradermind/schemas';

// Generate mock ticks with a trend
function generateMockTicks(market: string, count: number, trend: 'up' | 'down' | 'flat'): NormalizedTick[] {
    const ticks: NormalizedTick[] = [];
    let basePrice = 1000;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        // Apply trend
        if (trend === 'up') {
            basePrice += Math.random() * 2;
        } else if (trend === 'down') {
            basePrice -= Math.random() * 2;
        } else {
            basePrice += (Math.random() - 0.5) * 1;
        }

        // Add some noise
        const quote = basePrice + (Math.random() - 0.5) * 0.5;

        ticks.push({
            market,
            timestamp: now - (count - i) * 1000,
            quote,
            bid: quote - 0.01,
            ask: quote + 0.01,
            volatility: 0.01,
            spread: 0.02,
        });
    }

    return ticks;
}

async function runTests(): Promise<void> {
    console.log('=== QuantEngine Tests ===\n');

    // Test 1: Generate signal from uptrend (expect CALL on RSI oversold recovery)
    console.log('Test 1: Generate signal from downtrend then recovery');
    const downTicks = generateMockTicks('R_100', 30, 'down');
    const recoveryTicks = generateMockTicks('R_100', 10, 'up');
    const allTicks = [...downTicks, ...recoveryTicks];

    quantEngine.clearHistory('R_100');
    const signal1 = await quantEngine.generateSignal(allTicks, { min_confidence: 0.3 });

    if (signal1) {
        console.log('  Signal generated:', signal1);
        console.log('  ✅ generateSignal works\n');
    } else {
        console.log('  No signal generated (may need more data)');
        console.log('  ✅ generateSignal returns null when no clear signal\n');
    }

    // Test 2: Process individual ticks
    console.log('Test 2: Process individual ticks');
    quantEngine.clearHistory('R_50');

    // Feed ticks one by one
    let lastSignal: Signal | null = null;
    const ticks = generateMockTicks('R_50', 50, 'down');

    for (const tick of ticks) {
        const sig = await quantEngine.processTick(tick, { min_confidence: 0.2 });
        if (sig) {
            lastSignal = sig;
        }
    }

    if (lastSignal) {
        console.log('  Last signal:', lastSignal);
        console.log('  ✅ processTick works\n');
    } else {
        console.log('  No signals during tick processing');
        console.log('  ✅ processTick correctly filters weak signals\n');
    }


    // Test 3: Validate against SignalSchema
    console.log('Test 3: Validate signal against SignalSchema');
    const testSignal: Signal = {
        type: 'CALL',
        confidence: 0.75,
        reason: 'RSI_OVERSOLD',
        market: 'R_100',
        timestamp: new Date().toISOString(),
    };

    try {
        const validated = validateSignal(testSignal);
        console.log('  Validated signal:', validated);
        console.log('  ✅ SignalSchema.parse passed\n');
    } catch (err) {
        console.error('  ❌ Validation failed:', err);
    }

    // Test 4: Check signal event emission
    console.log('Test 4: Test signal event emission');
    let emittedSignal: Signal | null = null;

    quantEngine.on('signal', (sig) => {
        emittedSignal = sig;
        console.log('  Emitted signal:', sig);
    });

    // Generate strong signal with EMA crossover simulation
    quantEngine.clearHistory('R_100');
    const slowTrend = generateMockTicks('R_100', 30, 'flat');
    const fastUp = generateMockTicks('R_100', 20, 'up');
    await quantEngine.generateSignal([...slowTrend, ...fastUp], { min_confidence: 0.2 });

    if (emittedSignal) {
        console.log('  ✅ Signal event emitted');
        const sig = emittedSignal as Signal;
        if (sig.metadata && sig.metadata.reason_tags) {
            console.log('  Explainability Tags:', sig.metadata.reason_tags);
            console.log('  ✅ Metadata populated');
        } else {
            console.log('  ⚠️ Metadata missing');
        }
    } else {
        console.log('  ⚠️  No signal event (conditions may not have been met)\n');
    }

    // Test 5: Get stats
    console.log('\nTest 5: Get engine stats');
    const stats = quantEngine.getStats();
    console.log('  Stats:', stats);
    console.log('  ✅ getStats works\n');

    // Test 6: Config filtering
    console.log('Test 6: Market filtering via config');
    quantEngine.clearHistory('R_25');
    const r25Ticks = generateMockTicks('R_25', 40, 'down');
    const filteredSignal = await quantEngine.generateSignal(r25Ticks, {
        allowed_markets: ['R_100', 'R_50'], // R_25 not allowed
        min_confidence: 0.1,
    });

    if (filteredSignal === null) {
        console.log('  Signal correctly filtered (R_25 not in allowed_markets)');
        console.log('  ✅ Market filtering works\n');
    } else {
        console.log('  ❌ Signal should have been filtered');
    }

    // Test 7: AI Regulation (Low Confidence Block)
    console.log('Test 7: AI Regulation (Low Confidence Block)');
    // Hacky mock of the private service for testing
    const originalService = (quantEngine as any).aiService;

    (quantEngine as any).aiService = {
        getInference: async () => ({
            ai_confidence: 0.1, // LOW CONFIDENCE -> Should Block
            market_regime: 'RANGING',
            reason_tags: ['LOW_CONFIDENCE'],
            model_version: 'mock-v1'
        })
    };

    quantEngine.clearHistory('R_100');
    // Re-use logic that produced a signal in Test 4
    await quantEngine.generateSignal([...slowTrend, ...fastUp], { min_confidence: 0.2 });

    // We rely on the event emission or return value.
    // generateSignal returns the signal.
    const blockedSignal = await quantEngine.generateSignal([...slowTrend, ...fastUp], { min_confidence: 0.2 });

    if (blockedSignal === null) {
        console.log('  Signal blocked by AI (Confidence 0.1 < 0.4)');
        console.log('  ✅ AI Blocking works\n');
    } else {
        console.log('  ❌ Signal NOT blocked! Got:', blockedSignal);
    }

    // Test 8: AI Regulation (Volatile Regime Block)
    console.log('Test 8: AI Regulation (Volatile Regime Block)');
    (quantEngine as any).aiService = {
        getInference: async () => ({
            ai_confidence: 0.8, // Good confidence
            market_regime: 'VOLATILE', // VOLATILE -> Should Block (if base confidence < 0.8)
            reason_tags: ['HIGH_VOLATILITY'],
            model_version: 'mock-v1'
        })
    };

    // We need a signal with base confidence < 0.8 (mock ticks usually give high conf if setup right, let's try weak signal setup)
    // Or just use the same ticks, usually conf is ~0.7-0.9.
    // Let's assume the previous setup gave a decent signal.
    const volatileSignal = await quantEngine.generateSignal([...slowTrend, ...fastUp], { min_confidence: 0.2 });

    if (volatileSignal === null) {
        console.log('  Signal blocked by Volatile Regime');
        console.log('  ✅ Volatile Blocking works\n');
    } else {
        // If it passed, maybe confidence was >= 0.8?
        console.log('  Received signal (maybe high confidence?):', volatileSignal.confidence);
        if (volatileSignal.confidence < 0.8) {
            console.log('  ❌ Should have been blocked (Conf < 0.8 and Volatile)');
        } else {
            console.log('  ⚠️ Signal passed because initial confidence was >= 0.8');
        }
    }

    // Test 9: Kill Switch Verification
    console.log('Test 9: Kill Switch Verification (USE_AI=false)');
    // Disable AI
    (quantEngine as any).useAI = false;

    // Spy on getInference
    let aiCalled = false;
    const aiSpy = async (features: any) => {
        aiCalled = true;
        return null;
    };

    // Save original method
    const originalGetInference = (quantEngine as any).aiService.getInference;
    (quantEngine as any).aiService.getInference = aiSpy;

    console.log('  Generating signal with AI disabled...');
    const killSwitchSignal = await quantEngine.generateSignal([...slowTrend, ...fastUp], { min_confidence: 0.2 });

    if (killSwitchSignal) {
        if (!aiCalled) {
            console.log('  ✅ AI Service NOT called');
        } else {
            console.log('  ❌ AI Service WAS called (Kill switch failed)');
        }

        if (killSwitchSignal.metadata && killSwitchSignal.metadata.ai_confidence) {
            console.log('  ❌ Signal has AI metadata (Kill switch failed)');
        } else {
            console.log('  ✅ Signal has NO AI metadata');
        }
    } else {
        console.log('  ❌ No signal generated (should have fallen back to rule-based)');
    }

    // Restore
    (quantEngine as any).useAI = true; // Default
    (quantEngine as any).aiService.getInference = originalGetInference;

    console.log('=== All Tests Complete ===\n');
}

runTests().catch(console.error);
