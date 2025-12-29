
/**
 * End-to-End Simulation: QuantEngine + AI Overlay
 */

import { quantEngine, Signal } from './QuantEngine.js';
import { NormalizedTick } from './MarketDataService.js';

// --- Utilities ---
function generateMockTicks(market: string, count: number, type: 'up' | 'down' | 'flat' | 'volatile'): NormalizedTick[] {
    const ticks: NormalizedTick[] = [];
    let basePrice = 1000;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        let noise = (Math.random() - 0.5) * 0.5;
        let change = 0;

        if (type === 'up') change = 1.0;
        if (type === 'down') change = -1.0;
        if (type === 'flat') change = (Math.random() - 0.5) * 0.2;
        if (type === 'volatile') {
            change = (Math.random() - 0.5) * 5.0; // Big swings
            noise = (Math.random() - 0.5) * 2.0;
        }

        basePrice += change + noise;
        const quote = basePrice;

        ticks.push({
            market,
            timestamp: now - (count - i) * 1000,
            quote,
            bid: quote - 0.01,
            ask: quote + 0.01,
            volatility: type === 'volatile' ? 0.05 : 0.01,
            spread: 0.02,
        });
    }
    return ticks;
}

// Mock AI Service Helper
function mockAIService(confidence: number, regime: string) {
    (quantEngine as any).aiService.getInference = async () => ({
        ai_confidence: confidence,
        market_regime: regime,
        reason_tags: confidence > 0.6 ? ['MOCKED_CONFIRMATION'] : ['MOCKED_WEAKNESS'],
        model_version: 'sim-v1'
    });
}

async function runSimulation() {
    console.log('=== QuantEngine End-to-End Simulation ===\n');

    const originalAiService = (quantEngine as any).aiService.getInference;
    (quantEngine as any).useAI = true;

    // SCENARIO 1: Ranging Market (Noise Filtering)
    console.log('Scenario 1: Ranging Market (AI Filtering)');
    const rangingTicks = generateMockTicks('R_RANGE', 60, 'flat');

    // Simulate: Rule system might find weak signal, AI sees Ranging/Low Conf
    quantEngine.clearHistory('R_RANGE');

    // 1a. Rule Only (Disable AI)
    (quantEngine as any).useAI = false;
    // Force a "fake" opportunity by injecting a tailored dip at the end
    const dipTicks = [...rangingTicks];
    dipTicks[dipTicks.length - 1].quote -= 20; // Sudden RSI dip

    const ruleSignal = await quantEngine.generateSignal(dipTicks, { min_confidence: 0.2 });
    console.log('  [Rule-Only] Signal:', ruleSignal ? `${ruleSignal.type} (${ruleSignal.confidence.toFixed(2)})` : 'None');

    // 1b. With AI (Enable AI, Mock "Ranging/Low Conf")
    (quantEngine as any).useAI = true;
    mockAIService(0.3, 'RANGING'); // Low confidence

    const aiSignal = await quantEngine.generateSignal(dipTicks, { min_confidence: 0.2 });
    console.log('  [AI-Overlay] Signal:', aiSignal ? 'Passed' : 'BLOCKED');

    if (ruleSignal && !aiSignal) {
        console.log('  ✅ AI successfully filtered weak signal in Ranging market');
    } else {
        console.log('  ⚠️ AI filtering verification inconclusive (Check logs)');
    }


    // SCENARIO 2: Trending Market (Confirmation)
    console.log('\nScenario 2: Trending Market (AI Confirmation)');
    const trainingTicks = generateMockTicks('R_TREND', 60, 'up'); // Uptrend

    // 2a. Rule Only
    (quantEngine as any).useAI = false;
    quantEngine.clearHistory('R_TREND');
    const ruleTrendSignal = await quantEngine.generateSignal(trainingTicks, { min_confidence: 0.2 });
    console.log('  [Rule-Only] Signal:', ruleTrendSignal ? `${ruleTrendSignal.type} (${ruleTrendSignal.confidence.toFixed(2)})` : 'None');

    // 2b. With AI (Enable AI, Mock "Trend/High Conf")
    (quantEngine as any).useAI = true;
    quantEngine.clearHistory('R_TREND'); // Clear again to ensure clean state
    mockAIService(0.9, 'TRENDING');

    const aiTrendSignal = await quantEngine.generateSignal(trainingTicks, { min_confidence: 0.2 });
    console.log('  [AI-Overlay] Signal:', aiTrendSignal ? `${aiTrendSignal.type} (${aiTrendSignal.confidence.toFixed(2)})` : 'None');

    if (aiTrendSignal && aiTrendSignal.metadata?.reason_tags?.some((t: string) => t.includes('ML_CONFIRMED'))) {
        console.log(`  ✅ AI Confirmed Signal. Tags: ${aiTrendSignal.metadata.reason_tags}`);
        if (ruleTrendSignal && aiTrendSignal.confidence > ruleTrendSignal.confidence) {
            console.log('  ✅ Confidence Boosted (Rule: ' + ruleTrendSignal.confidence.toFixed(2) + ' -> AI: ' + aiTrendSignal.confidence.toFixed(2) + ')');
        }
    } else {
        console.log('  ⚠️ AI Confirmation missing or tags logic failed');
    }


    // SCENARIO 3: Volatile Market (Safety)
    console.log('\nScenario 3: Volatile Market (Safety Block)');
    const volatileTicks = generateMockTicks('R_VOL', 60, 'volatile');

    // 3a. Rule Only (might trigger on huge swings)
    (quantEngine as any).useAI = false;
    quantEngine.clearHistory('R_VOL');
    const ruleVolSignal = await quantEngine.generateSignal(volatileTicks, { min_confidence: 0.1 }); // Low thresh to catch something
    console.log('  [Rule-Only] Signal:', ruleVolSignal ? 'Generated' : 'None');

    // 3b. With AI (Mock "Volatile")
    (quantEngine as any).useAI = true;
    quantEngine.clearHistory('R_VOL');
    mockAIService(0.5, 'VOLATILE'); // Decent confidence but Volatile regime

    // Ensure base signal conf is < 0.8 (it likely is with random mock data)
    const aiVolSignal = await quantEngine.generateSignal(volatileTicks, { min_confidence: 0.1 });
    console.log('  [AI-Overlay] Signal:', aiVolSignal ? 'Passed' : 'BLOCKED');

    if (ruleVolSignal && !aiVolSignal) {
        console.log('  ✅ AI Blocked signal due to Volatile Regime');
    } else if (!ruleVolSignal) {
        console.log('  ℹ️  Rule-based system already filtered it (Good, but didn\'t test AI block)');
    } else {
        console.log('  ❌ AI failed to block volatile signal');
    }


    // SCENARIO 4: Determinism Check
    console.log('\nScenario 4: Determinism Check');
    // Run exactly same input twice with same Mock AI
    mockAIService(0.7, 'TRENDING');
    quantEngine.clearHistory('R_DET');
    const detTicks = generateMockTicks('R_DET', 50, 'up');

    const run1 = await quantEngine.generateSignal(detTicks);
    const run1Json = JSON.stringify(run1);

    quantEngine.clearHistory('R_DET'); // Reset state
    const run2 = await quantEngine.generateSignal(detTicks);
    const run2Json = JSON.stringify(run2);

    if (run1Json === run2Json) {
        console.log('  ✅ Verification Passed: Output is strictly deterministic.');
    } else {
        console.log('  ❌ Determinism FAILED.');
        console.log('  Run 1:', run1Json);
        console.log('  Run 2:', run2Json);
    }

    // Restore
    (quantEngine as any).aiService.getInference = originalAiService;
    console.log('\n=== Simulation Complete ===');
}

runSimulation().catch(console.error);
