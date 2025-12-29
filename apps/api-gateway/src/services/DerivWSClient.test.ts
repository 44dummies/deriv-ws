/**
 * DerivWSClient Test Script
 * Tests connection, subscription, and event handling
 */

import { derivWSClient, Tick } from './DerivWSClient.js';

async function runTest(): Promise<void> {
    console.log('═══════════════════════════════════════════════');
    console.log('  DerivWSClient Test');
    console.log('═══════════════════════════════════════════════\n');

    let tickCount = 0;
    const maxTicks = 10;

    // Event listeners
    derivWSClient.on('connected', () => {
        console.log('✅ Connected to Deriv\n');
        console.log('Subscribing to R_100...');
        derivWSClient.subscribe('R_100');
    });

    derivWSClient.on('subscribed', (market: string) => {
        console.log(`✅ Subscribed to ${market}\n`);
        console.log('Waiting for ticks...\n');
    });

    derivWSClient.on('tick', (tick: Tick) => {
        tickCount++;
        console.log(`Tick ${tickCount}:`, {
            market: tick.market,
            quote: tick.quote.toFixed(2),
            bid: tick.bid.toFixed(2),
            ask: tick.ask.toFixed(2),
            timestamp: tick.timestamp,
        });

        if (tickCount >= maxTicks) {
            console.log('\n✅ Received', maxTicks, 'ticks successfully');
            console.log('\nStats:', derivWSClient.getStats());
            derivWSClient.disconnect();
            process.exit(0);
        }
    });

    derivWSClient.on('heartbeat', (latency: number) => {
        console.log(`♥ Heartbeat: ${latency}ms`);
    });

    derivWSClient.on('circuitBreaker', (reason: string) => {
        console.log(`⚠️ Circuit breaker: ${reason}`);
    });

    derivWSClient.on('error', (error: Error) => {
        console.error('❌ Error:', error.message);
    });

    derivWSClient.on('disconnected', (reason: string) => {
        console.log('Disconnected:', reason);
    });

    // Connect
    console.log('Connecting to Deriv WebSocket...\n');
    derivWSClient.connect();

    // Wait for connection
    derivWSClient.once('connected', async () => {
        console.log('✅ Connected to Deriv\n');

        // 1. Test Authorization (Invalid)
        console.log('Test 1: Authorization (Invalid Token)');
        const authResult = await derivWSClient.authorize('invalid_token_123');
        if (authResult === false) {
            console.log('  ✅ Auth correctly rejected invalid token');
        } else {
            console.log('  ❌ Auth accepted invalid token (Unexpected)');
        }

        // 2. Test Buy Contract (Expect Auth Error)
        console.log('\nTest 2: Buy Contract (Un-Authorized)');
        try {
            await derivWSClient.buyContract({
                contract_type: 'CALL',
                amount: 10,
                basis: 'stake',
                symbol: 'R_100',
                duration: 1,
                duration_unit: 'm',
                currency: 'USD'
            });
            console.log('  ❌ Buy succeeded unexpectedly');
        } catch (err: any) {
            console.log(`  ✅ Buy failed as expected: ${err.message}`);
            if (err.message.includes('AuthorizationRequired')) {
                console.log('    ✅ Correct Error Code Mapped');
            }
        }

        console.log('\nTest 3: Ticks Subscription');
        console.log('Subscribing to R_100...');
        derivWSClient.subscribe('R_100');
    });

    // Timeout
    setTimeout(() => {
        if (tickCount === 0) {
            console.log('\n⚠️ No ticks received within 30 seconds');
        }
        console.log('\nFinal stats:', derivWSClient.getStats());
        derivWSClient.disconnect();
        process.exit(tickCount > 0 ? 0 : 1);
    }, 30000);
}

runTest().catch(console.error);
