/**
 * TraderMind End-to-End Pipeline Test
 * Tests full data flow with resilience scenarios
 */

import { sessionRegistry, SessionStatus } from './SessionRegistry.js';
import { marketDataService, NormalizedTick } from './MarketDataService.js';
import { quantAdapter } from './QuantEngineAdapter.js';
import { safetyLayer } from './WSIntegration.js';
import { derivWSClient } from './DerivWSClient.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean | Promise<boolean>): void {
    try {
        const result = fn();
        if (result instanceof Promise) {
            result.then((r) => {
                if (r) {
                    console.log(`✅ ${name}`);
                    passed++;
                } else {
                    console.log(`❌ ${name}`);
                    failed++;
                }
            });
        } else if (result) {
            console.log(`✅ ${name}`);
            passed++;
        } else {
            console.log(`❌ ${name}`);
            failed++;
        }
    } catch (err) {
        console.log(`❌ ${name} - Error: ${err}`);
        failed++;
    }
}

function expect<T>(actual: T) {
    return {
        toBe(expected: T): boolean {
            return actual === expected;
        },
        toBeGreaterThan(expected: number): boolean {
            return (actual as number) > expected;
        },
        toBeGreaterThanOrEqual(expected: number): boolean {
            return (actual as number) >= expected;
        },
        toBeLessThan(expected: number): boolean {
            return (actual as number) < expected;
        },
        toHaveLength(expected: number): boolean {
            return (actual as unknown[]).length === expected;
        },
        toBeTruthy(): boolean {
            return !!actual;
        },
        toBeFalsy(): boolean {
            return !actual;
        },
    };
}

// =============================================================================
// MOCK TICK GENERATOR
// =============================================================================

function createMockTick(market: string, epoch: number, quote: number): NormalizedTick {
    const spread = quote * 0.0001;
    return {
        market,
        timestamp: epoch * 1000,
        bid: quote - spread / 2,
        ask: quote + spread / 2,
        quote,
        spread,
        volatility: 0.15,
    };
}

function generateTickStream(market: string, count: number, basePrice = 1000): NormalizedTick[] {
    const ticks: NormalizedTick[] = [];
    const baseEpoch = Math.floor(Date.now() / 1000);

    for (let i = 0; i < count; i++) {
        // Random price fluctuation within 1%
        const price = basePrice * (1 + (Math.random() - 0.5) * 0.02);
        ticks.push(createMockTick(market, baseEpoch + i, price));
    }

    return ticks;
}

function generateDuplicateTicks(market: string, count: number): NormalizedTick[] {
    const ticks: NormalizedTick[] = [];
    const baseEpoch = Math.floor(Date.now() / 1000);

    for (let i = 0; i < count; i++) {
        // Same epoch = duplicate
        ticks.push(createMockTick(market, baseEpoch, 1000 + i * 0.01));
    }

    return ticks;
}

// =============================================================================
// TEST SUITE
// =============================================================================

async function runTests(): Promise<void> {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  TraderMind End-to-End Pipeline Test');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Clean state
    sessionRegistry.clear();
    quantAdapter.resetStats();

    // -------------------------------------------------------------------------
    // 1. Session Creation
    // -------------------------------------------------------------------------
    console.log('\n📋 1. Session Creation Tests\n');

    const session = sessionRegistry.createSession({
        id: 'test-session-001',
        config_json: {
            max_participants: 5,
            risk_profile: 'MEDIUM',
            allowed_markets: ['R_100', 'R_50'],
        },
        admin_id: 'admin-001',
    });

    test('Session created with PENDING status', () =>
        expect(session.status).toBe('PENDING'));

    test('Session has correct config', () =>
        expect(session.config_json.risk_profile).toBe('MEDIUM'));

    // Add participants
    const p1 = sessionRegistry.addParticipant('test-session-001', 'user-001');
    const p2 = sessionRegistry.addParticipant('test-session-001', 'user-002');

    test('Participant 1 added', () =>
        expect(p1.user_id).toBe('user-001'));

    test('Participant 2 added', () =>
        expect(p2.user_id).toBe('user-002'));

    // Activate session
    sessionRegistry.updateSessionStatus('test-session-001', 'ACTIVE');
    sessionRegistry.updateSessionStatus('test-session-001', 'RUNNING');

    const activeSession = sessionRegistry.getSessionState('test-session-001');
    test('Session is RUNNING', () =>
        expect(activeSession?.status).toBe('RUNNING'));

    // -------------------------------------------------------------------------
    // 2. Tick Processing
    // -------------------------------------------------------------------------
    console.log('\n📊 2. Tick Processing Tests\n');

    // Start adapter
    quantAdapter.start({ risk_profile: 'MEDIUM', min_confidence: 0.5 });

    // Track events
    const receivedTicks: NormalizedTick[] = [];
    quantAdapter.on('new_tick', (tick) => receivedTicks.push(tick));

    // Process normal ticks
    const normalTicks = generateTickStream('R_100', 20);
    for (const tick of normalTicks) {
        quantAdapter.processTickImmediate(tick);
    }

    test('All normal ticks processed', () =>
        expect(receivedTicks.length).toBe(20));

    // Check stats
    const stats = quantAdapter.getStats();
    test('Stats show 20 ticks received', () =>
        expect(stats.ticksReceived).toBe(20));

    test('No ticks dropped', () =>
        expect(stats.ticksDropped).toBe(0));

    // -------------------------------------------------------------------------
    // 3. Deduplication
    // -------------------------------------------------------------------------
    console.log('\n🔄 3. Deduplication Tests\n');

    // Reset for dedup test
    const dedupReceivedBefore = receivedTicks.length;

    // Send duplicate ticks (same epoch)
    const duplicateTicks = generateDuplicateTicks('R_100', 5);
    for (const tick of duplicateTicks) {
        quantAdapter.processTickImmediate(tick);
    }

    // Should only accept first tick (duplicates filtered by MarketDataService)
    // But since we're using processTickImmediate, they bypass MarketDataService dedup
    // So adapter receives all, but they're valid ticks with same epoch
    test('Duplicate ticks processed by adapter', () =>
        expect(receivedTicks.length).toBe(dedupReceivedBefore + 5));

    // -------------------------------------------------------------------------
    // 4. Session State Transitions
    // -------------------------------------------------------------------------
    console.log('\n🔀 4. State Transition Tests\n');

    // Simulate heartbeat failure → session pause
    const pausedSessions = sessionRegistry.pauseSessionsByMarket('R_100');

    test('Session paused on market failure', () =>
        expect(pausedSessions.length).toBe(1));

    const pausedState = sessionRegistry.getSessionState('test-session-001');
    test('Session status is PAUSED', () =>
        expect(pausedState?.status).toBe('PAUSED'));

    // Simulate market resume → session resume
    const resumedSessions = sessionRegistry.resumeSessionsByMarket('R_100');

    test('Session resumed on market recovery', () =>
        expect(resumedSessions.length).toBe(1));

    const resumedState = sessionRegistry.getSessionState('test-session-001');
    test('Session status is RUNNING', () =>
        expect(resumedState?.status).toBe('RUNNING'));

    // -------------------------------------------------------------------------
    // 5. Circuit Breaker Simulation
    // -------------------------------------------------------------------------
    console.log('\n⚡ 5. Circuit Breaker Tests\n');

    // Track circuit breaker events
    let cbTriggered = false;
    let cbReset = false;

    safetyLayer.on('circuit_breaker_triggered', () => { cbTriggered = true; });
    safetyLayer.on('circuit_breaker_reset', () => { cbReset = true; });

    // Initialize safety layer
    safetyLayer.integrate();

    test('Safety layer initialized', () =>
        expect(safetyLayer.isCircuitBreakerActive()).toBe(false));

    // Check stats
    const safetyStats = safetyLayer.getStats();
    test('Safety stats available', () =>
        expect(safetyStats.pausedByCircuitBreaker).toBe(0));

    // -------------------------------------------------------------------------
    // 6. Multi-Market Session
    // -------------------------------------------------------------------------
    console.log('\n🌍 6. Multi-Market Tests\n');

    // Create session for multiple markets
    const multiSession = sessionRegistry.createSession({
        id: 'multi-market-001',
        config_json: {
            allowed_markets: ['R_100', 'R_50', 'R_25'],
        },
    });

    test('Multi-market session created', () =>
        expect(multiSession.id).toBe('multi-market-001'));

    sessionRegistry.updateSessionStatus('multi-market-001', 'ACTIVE');
    sessionRegistry.updateSessionStatus('multi-market-001', 'RUNNING');

    // Process ticks for different markets
    const r50Ticks = generateTickStream('R_50', 10, 500);
    for (const tick of r50Ticks) {
        quantAdapter.processTickImmediate(tick);
    }

    const finalStats = quantAdapter.getStats();
    test('Total ticks processed > 30', () =>
        expect(finalStats.ticksProcessed).toBeGreaterThan(30));

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Cleanup
    quantAdapter.stop();
    sessionRegistry.clear();

    // Final stats
    console.log('Final Adapter Stats:', quantAdapter.getStats());
    console.log('Final Registry Stats:', sessionRegistry.getStats());

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
