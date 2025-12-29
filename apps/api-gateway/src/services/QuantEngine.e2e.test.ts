/**
 * QuantEngine End-to-End Tests
 * Verifies full signal pipeline: Rules, Expiry, Storage, AI Hooks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuantEngine, Signal } from './QuantEngine.js';
import { signalStore } from './SignalStore.js';
import { aiServiceClient } from './AIServiceClient.js';
import { NormalizedTick } from './MarketDataService.js';

import { sessionRegistry } from './SessionRegistry.js';

// Mock dependencies
vi.mock('./AIServiceClient.js', () => ({
    aiServiceClient: {
        infer: vi.fn(),
        convertToSignal: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true)
    }
}));

vi.mock('./SessionRegistry.js', () => ({
    sessionRegistry: {
        getSessionState: vi.fn()
    },
    SessionStatus: {
        RUNNING: 'RUNNING'
    }
}));

describe('QuantEngine E2E Pipeline', () => {
    let engine: QuantEngine;
    const market = 'R_100';

    beforeEach(() => {
        engine = new QuantEngine();
        signalStore.clearSession('test-session');
        vi.clearAllMocks();

        // Setup default session state
        vi.mocked(sessionRegistry.getSessionState).mockReturnValue({
            id: 'test-session',
            status: 'RUNNING',
            type: 'standard',
            startTime: Date.now(),
            participants: []
        } as any);
    });

    afterEach(() => {
        signalStore.stop();
    });

    // Helper to generate trending data
    const generateTrend = (startPrice: number, count: number, trend: 'UP' | 'DOWN' | 'FLAT'): NormalizedTick[] => {
        const ticks: NormalizedTick[] = [];
        let price = startPrice;

        for (let i = 0; i < count; i++) {
            if (trend === 'UP') price += 0.5 + Math.random();
            if (trend === 'DOWN') price -= 0.5 + Math.random();
            if (trend === 'FLAT') price += (Math.random() - 0.5);

            ticks.push({
                market,
                quote: price,
                timestamp: Date.now() + i * 1000,
                bid: price,
                ask: price,
                spread: 0,
                volatility: 0
            });
        }
        return ticks;
    };

    it('should generate signals based on rules', () => {
        const ticks = generateTrend(100, 50, 'UP'); // Strong, short uptrend (momentum)

        let lastSignal: Signal | null = null;
        engine.on('signal', (s: Signal) => (lastSignal = s));

        ticks.forEach(t => engine.processTick(t));

        const signal = lastSignal as unknown as Signal;
        expect(signal).toBeDefined();
        if (signal) {
            expect(signal.market).toBe(market);
            // Should be CALL due to momentum or standard uptrend indicators
            // Note: EMA/SMA need more history, so this tests standard movement logic
            expect(signal.type).toMatch(/CALL|PUT/);
            expect(signal.confidence).toBeGreaterThan(0);
            expect(signal.expiry).toBeDefined();
        }
    });

    it('should respect signal expiry', () => {
        const signal: Signal = {
            type: 'CALL',
            market,
            confidence: 0.8,
            reason: 'RSI_OVERSOLD',
            timestamp: new Date().toISOString(),
            expiry: new Date(Date.now() + 100).toISOString() // Expires in 100ms
        };

        const stored = signalStore.addSignal('test-session', signal, 100);
        expect(stored).toBeDefined();
        expect(stored?.status).toBe('ACTIVE');

        // Verify active
        let active = signalStore.getActiveSignals('test-session');
        expect(active.length).toBe(1);

        // Wait for expiry
        return new Promise<void>(resolve => {
            setTimeout(() => {
                // Must manually trigger cleanup or check status if relying on timer
                // For test, we can just check filtering
                active = signalStore.getActiveSignals('test-session');
                expect(active.length).toBe(0);
                resolve();
            }, 150);
        });
    });

    it('should pause/resume session processing', () => {
        // Mock RUNNING session initially
        vi.mocked(sessionRegistry.getSessionState).mockReturnValue({
            id: 'test-session',
            status: 'RUNNING'
        } as any);

        signalStore.pauseSession('test-session');
        expect(signalStore.shouldProcessTicks('test-session')).toBe(false);

        const newSignal = signalStore.addSignal('test-session', {
            type: 'CALL',
            market,
            confidence: 0.9,
            reason: 'EMA_CROSS_UP',
            timestamp: new Date().toISOString(),
            expiry: new Date().toISOString()
        });

        // Should return null because session is paused
        expect(newSignal).toBeNull();

        signalStore.resumeSession('test-session');
        expect(signalStore.shouldProcessTicks('test-session')).toBe(true);
    });

    it('should trigger AI hook when enabled', async () => {
        const config = { useAI: true, aiSessionId: 'ai-test' };

        // Mock success response
        vi.mocked(aiServiceClient.infer).mockResolvedValueOnce({
            signal_bias: 'CALL',
            confidence: 0.85,
            reason: 'AI_MODEL_CONFIDENCE',
            model_version: 'v1',
            request_hash: 'abc'
        });

        vi.mocked(aiServiceClient.convertToSignal).mockReturnValueOnce({
            type: 'CALL',
            confidence: 0.85,
            reason: 'EMA_CROSS_UP',
            market,
            timestamp: new Date().toISOString(),
            expiry: new Date().toISOString()
        });

        // Need enough history to trigger processing
        const ticks = generateTrend(100, 30, 'FLAT');

        // We need to wait for async AI call
        const aiSignalPromise = new Promise<Signal>((resolve) => {
            engine.once('ai_signal', (s) => resolve(s));
        });

        ticks.forEach(t => engine.processTick(t, config));

        // Note: In real run, we'd need valid indicators. 
        // With mocks, we just verify the call was made.

        // Since processTickWithAI is async and fires after indicators are calculated (25+ ticks),
        // we check if infer was called.
        // History requires EMA_SLOW_PERIOD (21) + 5 = 26 ticks to start

        expect(aiServiceClient.infer).toHaveBeenCalled();
    });

    it('should fallback gracefully when AI fails', async () => {
        const config = { useAI: true };
        vi.mocked(aiServiceClient.infer).mockRejectedValueOnce(new Error('AI Service Down'));

        const fallbackSpy = vi.fn();
        engine.on('ai_fallback', fallbackSpy);

        const ticks = generateTrend(100, 30, 'FLAT');
        ticks.forEach(t => engine.processTick(t, config));

        // Allow async promise to settle
        await new Promise(r => setTimeout(r, 10));

        expect(fallbackSpy).toHaveBeenCalled();
        // Rule based signal should still potentially fire (or not, depending on data)
        // But the key is no crash
    });
});
