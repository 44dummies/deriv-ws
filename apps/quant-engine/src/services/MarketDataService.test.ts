/**
 * MarketDataService Test Script
 * Tests connection to Deriv and tick data reception
 */

import { marketDataService, NormalizedTick } from './MarketDataService.js';

async function runTest(): Promise<void> {
    console.log('=== MarketDataService Test ===\n');

    let tickCount = 0;
    const maxTicks = 10;

    // Set up tick listener
    marketDataService.on('tick', (tick: NormalizedTick) => {
        tickCount++;
        console.log(`Tick ${tickCount}:`, {
            market: tick.market,
            quote: tick.quote.toFixed(2),
            bid: tick.bid.toFixed(2),
            ask: tick.ask.toFixed(2),
            volatility: tick.volatility.toFixed(4),
            spread: tick.spread.toFixed(4),
            timestamp: new Date(tick.timestamp).toISOString(),
        });

        if (tickCount >= maxTicks) {
            console.log('\n✅ Received', maxTicks, 'ticks successfully');
            marketDataService.disconnect();
            process.exit(0);
        }
    });

    // Set up event listeners
    marketDataService.on('connected', () => {
        console.log('✅ Connected to Deriv\n');
        console.log('Subscribing to markets...');
        marketDataService.subscribeToDefaultMarkets();
        console.log('Waiting for ticks...\n');
    });

    marketDataService.on('subscribed', (market: string) => {
        console.log(`✅ Subscribed to ${market}`);
    });

    marketDataService.on('error', (error: Error) => {
        console.error('❌ Error:', error.message);
    });

    marketDataService.on('disconnected', (reason: string) => {
        console.log('Disconnected:', reason);
    });

    // Connect
    console.log('Connecting to Deriv WebSocket...\n');
    marketDataService.connect();

    // Timeout after 30 seconds
    setTimeout(() => {
        if (tickCount === 0) {
            console.log('\n⚠️  No ticks received within 30 seconds');
            console.log('   This may be due to network issues or Deriv API unavailability');
        }
        console.log('\n=== Test Complete ===');
        marketDataService.disconnect();
        process.exit(tickCount > 0 ? 0 : 1);
    }, 30000);
}

runTest().catch(console.error);
