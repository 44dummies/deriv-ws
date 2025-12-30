
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TradingPipeline } from './TradingPipeline.js';
import { marketDataService } from './MarketDataService.js';
import { quantEngine } from './QuantEngine.js';
import { NormalizedTick } from './MarketDataService.js';

// Mock Dependencies
vi.mock('./MarketDataService.js', () => ({
    marketDataService: {
        on: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        subscribeToDefaultMarkets: vi.fn(),
        isHealthy: vi.fn().mockReturnValue(true), // Default to true for tests
    }
}));

vi.mock('./QuantEngine.js', () => ({
    quantEngine: {
        processTick: vi.fn(),
    }
}));

describe('TradingPipeline Chaos Tests', () => {
    let pipeline: TradingPipeline;
    let handlers: Record<string, Function> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        handlers = {};

        // Capture event handlers
        (marketDataService.on as any).mockImplementation((event: string, cb: Function) => {
            handlers[event] = cb;
        });

        pipeline = new TradingPipeline();
    });

    afterEach(() => {
        pipeline.stop();
    });

    function createTick(market: string): NormalizedTick {
        return {
            market,
            timestamp: Date.now(),
            bid: 100,
            ask: 102,
            quote: 101,
            spread: 2,
            volatility: 0.1
        };
    }

    it('should process ticks when running and connected', async () => {
        pipeline.start();
        pipeline.createDummySession('session-1');

        const tick = createTick('R_100');

        // Define QuantEngine behavior
        (quantEngine.processTick as any).mockResolvedValue({
            type: 'CALL',
            confidence: 0.9,
            reason: 'TEST',
            market: 'R_100',
            timestamp: new Date().toISOString()
        });

        // Simulate tick
        if (handlers['tick']) {
            await handlers['tick'](tick);
        }

        expect(quantEngine.processTick).toHaveBeenCalledWith(tick, expect.anything());
    });

    it('should NOT process ticks if Disconnected (Simulating Outage)', async () => {
        pipeline.start();
        pipeline.createDummySession('session-1');

        // Simulate Disconnect
        if (handlers['disconnected']) {
            handlers['disconnected']('Simulated Connection Loss');
        }

        // Emit tick DURING disconnect (Anomaly)
        const tick = createTick('R_100');
        if (handlers['tick']) {
            await handlers['tick'](tick);
        }

        // Ideally, it should NOT generate signals or process heavily?
        // Currently Implementation: logic checks "this.isRunning".
        // Does "disconnected" set isRunning = false? NO.
        // WE NEED TO FIX THIS in the implementation if we want robustness.

        // This test asserts CURRENT behavior or DESIRED behavior?
        // Requirement: "Verify sessions pause on WS failure"

        // So we EXPECT it to fail if we haven't implemented it.
        // Let's assert that it DOES process (failure case to prove need validation) 
        // OR assume we want it to NOT process.

        // We Expect it to NOT process
        expect(quantEngine.processTick).not.toHaveBeenCalled();
    });

    it('should Resume gracefully after Reconnect', async () => {
        pipeline.start();
        pipeline.createDummySession('session-1');

        // Disconnect
        if (handlers['disconnected']) handlers['disconnected']('Lost');

        // Reconnect
        if (handlers['connected']) handlers['connected']();

        // Tick
        const tick = createTick('R_100');
        if (handlers['tick']) await handlers['tick'](tick);

        expect(quantEngine.processTick).toHaveBeenCalled();
    });
});
