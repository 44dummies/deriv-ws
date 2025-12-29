
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketDataService, NormalizedTick } from './MarketDataService.js';
import { Tick } from './DerivWSClient.js';

// Mock DerivWSClient
const mockOn = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockIsConnected = vi.fn().mockReturnValue(true);

vi.mock('./DerivWSClient.js', () => ({
    derivWSClient: {
        on: (event: string, cb: any) => mockOn(event, cb),
        connect: () => mockConnect(),
        disconnect: () => mockDisconnect(),
        subscribe: (m: string) => mockSubscribe(m),
        unsubscribe: (m: string) => mockUnsubscribe(m),
        isConnected: () => mockIsConnected(),
    },
    // We export Tick interface, but here we just need to ensure mock works
}));

describe('MarketDataService Chaos Tests', () => {
    let service: MarketDataService;
    let tickCallback: (tick: Tick) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        // Capture the 'tick' event handler
        mockOn.mockImplementation((event, cb) => {
            if (event === 'tick') {
                tickCallback = cb;
            }
        });

        service = new MarketDataService();
        service.start();
    });

    afterEach(() => {
        service.stop();
    });

    function createMockTick(market: string, epoch: number, quote: number): Tick {
        return {
            market,
            epoch,
            quote,
            bid: quote - 0.5,
            ask: quote + 0.5,
            timestamp: new Date(epoch * 1000).toISOString(), // Satisfy RawTickSchema
            symbol: market, // legacy
            id: 'test-id',
            pip_size: 2
        } as unknown as Tick;
    }

    it('should deduplicate identical ticks', () => {
        const received: NormalizedTick[] = [];
        service.on('tick_received', (t) => received.push(t));

        const tick = createMockTick('R_100', 1000, 100.50);

        // Send duplicate burst
        if (tickCallback) {
            tickCallback(tick);
            tickCallback(tick);
            tickCallback(tick);
            tickCallback(tick);
            tickCallback(tick);
        }

        expect(received.length).toBe(1);
        expect(service.getDedupeStats().totalDuplicates).toBe(4);
    });

    it('should handle out-of-order ticks (reject outdated)', () => {
        const received: NormalizedTick[] = [];
        service.on('tick_received', (t) => received.push(t));

        if (!tickCallback) throw new Error("Callback not captured");

        // T1
        tickCallback(createMockTick('R_100', 1000, 100.0));
        // T3
        tickCallback(createMockTick('R_100', 1002, 102.0));
        // T2 (Out of date compared to T3)
        tickCallback(createMockTick('R_100', 1001, 101.0));

        // Expectation: Strict real-time systems often reject late ticks to preserve causal order for indicators
        // The current implementation probably accepts it (FAIL expectation if we want enforcement)
        // Let's see what happens.
        // If it accepts all 3, they will be emitted.

        // Update: We WANT to enforce rejection of late ticks
        expect(received.length).toBe(2);
        expect(received.find(t => t.timestamp === 1001000)).toBeUndefined(); // T2 should be dropped
    });

    it('should handle tick bursts without crashing', () => {
        const BURST_SIZE = 10000;
        const received: NormalizedTick[] = [];
        service.on('tick_received', (t) => received.push(t));

        if (!tickCallback) throw new Error("Callback not captured");

        const startTime = performance.now();
        for (let i = 0; i < BURST_SIZE; i++) {
            tickCallback(createMockTick('R_100', 2000 + i, 100 + (i * 0.01)));
        }
        const endTime = performance.now();

        expect(received.length).toBe(BURST_SIZE);
        console.log(`Processed ${BURST_SIZE} ticks in ${(endTime - startTime).toFixed(2)}ms`);
        expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
});
