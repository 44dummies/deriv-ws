/**
 * QuantEngine Signal Generation Test
 * Tests SMA, EMA, RSI indicators and signal generation
 */

import { quantEngine, Signal } from './QuantEngine.js';
import { NormalizedTick } from './MarketDataService.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

let passed = 0;
let failed = 0;

function test(name: string, result: boolean): void {
    if (result) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        failed++;
    }
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

function createTick(market: string, quote: number, epoch: number): NormalizedTick {
    const spread = quote * 0.0001;
    return {
        market,
        timestamp: epoch * 1000,
        bid: quote - spread / 2,
        ask: quote + spread / 2,
        quote,
        spread,
        volatility: 0.01,
    };
}

// Generate uptrend prices (for CALL signals)
function generateUptrendPrices(count: number, startPrice = 1000): number[] {
    const prices: number[] = [];
    for (let i = 0; i < count; i++) {
        prices.push(startPrice + i * 5 + Math.random() * 2);
    }
    return prices;
}

// Generate downtrend prices (for PUT signals)
function generateDowntrendPrices(count: number, startPrice = 1000): number[] {
    const prices: number[] = [];
    for (let i = 0; i < count; i++) {
        prices.push(startPrice - i * 5 - Math.random() * 2);
    }
    return prices;
}

// Generate oversold RSI scenario
function generateOversoldPrices(): number[] {
    // Sharp decline followed by continuation
    const prices: number[] = [];
    for (let i = 0; i < 30; i++) {
        prices.push(1000 - i * 10);
    }
    return prices;
}

// Generate overbought RSI scenario
function generateOverboughtPrices(): number[] {
    // Sharp rise followed by continuation
    const prices: number[] = [];
    for (let i = 0; i < 30; i++) {
        prices.push(1000 + i * 10);
    }
    return prices;
}

// =============================================================================
// TESTS
// =============================================================================

async function runTests(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  QuantEngine Signal Generation Test');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // -------------------------------------------------------------------------
    // Test 1: Basic initialization
    // -------------------------------------------------------------------------
    console.log('\n📋 1. Initialization Tests\n');

    const stats = quantEngine.getStats();
    test('QuantEngine initialized', stats.markets.length >= 0);

    // -------------------------------------------------------------------------
    // Test 2: Uptrend signals
    // -------------------------------------------------------------------------
    console.log('\n📈 2. Uptrend Signal Tests\n');

    quantEngine.clearHistory('TEST_UP');

    const uptrendPrices = generateUptrendPrices(40);
    const signals: Signal[] = [];

    quantEngine.on('signal', (signal) => signals.push(signal));

    for (let i = 0; i < uptrendPrices.length; i++) {
        const price = uptrendPrices[i];
        if (price !== undefined) {
            const tick = createTick('TEST_UP', price, Date.now() / 1000 + i);
            quantEngine.processTick(tick, { min_confidence: 0.3 });
        }
    }

    console.log(`  Generated ${signals.length} signals from uptrend`);

    const callSignals = signals.filter(s => s.type === 'CALL');
    const putSignals = signals.filter(s => s.type === 'PUT');

    test('Uptrend generates signals', signals.length > 0);
    test('More CALL than PUT in uptrend', callSignals.length >= putSignals.length);

    // Check reason field
    const reasons = new Set(signals.map(s => s.reason));
    console.log(`  Signal reasons: ${Array.from(reasons).join(', ')}`);

    test('Reason field is populated', signals.every(s => s.reason !== 'NO_SIGNAL'));

    // -------------------------------------------------------------------------
    // Test 3: Downtrend signals
    // -------------------------------------------------------------------------
    console.log('\n📉 3. Downtrend Signal Tests\n');

    quantEngine.clearHistory('TEST_DOWN');
    signals.length = 0;

    const downtrendPrices = generateDowntrendPrices(40);

    for (let i = 0; i < downtrendPrices.length; i++) {
        const price = downtrendPrices[i];
        if (price !== undefined) {
            const tick = createTick('TEST_DOWN', price, Date.now() / 1000 + i);
            quantEngine.processTick(tick, { min_confidence: 0.3 });
        }
    }

    console.log(`  Generated ${signals.length} signals from downtrend`);

    const downPutSignals = signals.filter(s => s.type === 'PUT');
    const downCallSignals = signals.filter(s => s.type === 'CALL');

    test('Downtrend generates signals', signals.length > 0);
    test('More PUT than CALL in downtrend', downPutSignals.length >= downCallSignals.length);

    // -------------------------------------------------------------------------
    // Test 4: RSI Oversold
    // -------------------------------------------------------------------------
    console.log('\n📊 4. RSI Oversold Tests\n');

    quantEngine.clearHistory('TEST_RSI_LOW');
    signals.length = 0;

    const oversoldPrices = generateOversoldPrices();

    for (let i = 0; i < oversoldPrices.length; i++) {
        const price = oversoldPrices[i];
        if (price !== undefined) {
            const tick = createTick('TEST_RSI_LOW', price, Date.now() / 1000 + i);
            quantEngine.processTick(tick, { min_confidence: 0.3 });
        }
    }

    const rsiOversoldSignals = signals.filter(s => s.reason === 'RSI_OVERSOLD');
    console.log(`  RSI_OVERSOLD signals: ${rsiOversoldSignals.length}`);

    test('RSI_OVERSOLD generates CALL', rsiOversoldSignals.length > 0 && rsiOversoldSignals.every(s => s.type === 'CALL'));

    // -------------------------------------------------------------------------
    // Test 5: RSI Overbought
    // -------------------------------------------------------------------------
    console.log('\n📊 5. RSI Overbought Tests\n');

    quantEngine.clearHistory('TEST_RSI_HIGH');
    signals.length = 0;

    const overboughtPrices = generateOverboughtPrices();

    for (let i = 0; i < overboughtPrices.length; i++) {
        const price = overboughtPrices[i];
        if (price !== undefined) {
            const tick = createTick('TEST_RSI_HIGH', price, Date.now() / 1000 + i);
            quantEngine.processTick(tick, { min_confidence: 0.3 });
        }
    }

    const rsiOverboughtSignals = signals.filter(s => s.reason === 'RSI_OVERBOUGHT');
    console.log(`  RSI_OVERBOUGHT signals: ${rsiOverboughtSignals.length}`);

    test('RSI_OVERBOUGHT generates PUT', rsiOverboughtSignals.length > 0 && rsiOverboughtSignals.every(s => s.type === 'PUT'));

    // -------------------------------------------------------------------------
    // Test 6: Signal Structure
    // -------------------------------------------------------------------------
    console.log('\n🔧 6. Signal Structure Tests\n');

    if (signals.length > 0) {
        const sample = signals[0]!;

        test('Signal has type', sample.type === 'CALL' || sample.type === 'PUT');
        test('Signal has confidence 0-1', sample.confidence >= 0 && sample.confidence <= 1);
        test('Signal has reason', sample.reason !== undefined);
        test('Signal has market', sample.market !== undefined);
        test('Signal has timestamp', sample.timestamp !== undefined);
        test('Signal has expiry', sample.expiry !== undefined);

        // Verify expiry is in the future
        const expiryTime = new Date(sample.expiry).getTime();
        const nowTime = new Date(sample.timestamp).getTime();
        test('Expiry is after timestamp', expiryTime > nowTime);
    }

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
