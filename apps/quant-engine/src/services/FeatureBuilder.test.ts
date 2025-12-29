
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FeatureBuilder } from './FeatureBuilder.js';
import { Tick } from '@tradermind/schemas';

// Mock Ticks helper
function createTicks(prices: number[]): Tick[] {
    return prices.map((p, i) => ({
        market: 'TEST',
        quote: p,
        timestamp: i * 1000
    }));
}

describe('FeatureBuilder', () => {
    const builder = new FeatureBuilder();
    const prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i * 0.1) * 10);
    const ticks = createTicks(prices);

    it('should maintain determinism', () => {
        const result1 = builder.buildFeatures(ticks);
        const result2 = builder.buildFeatures(ticks);
        assert.deepStrictEqual(result1, result2);
    });

    it('should calculate RSI correctly', () => {
        // Simple case: all gains
        const upTrend = Array.from({ length: 30 }, (_, i) => 100 + i);
        const rsi = builder.calculateRSI(upTrend);
        assert.ok(rsi > 70, `RSI ${rsi} should be high for uptrend`);
    });

    it('should calculate EMA correctly', () => {
        const flat = Array(50).fill(100);
        const ema = builder.calculateEMA(flat, 10);
        assert.strictEqual(Math.round(ema), 100);
    });

    it('should calculate Momentum correctly', () => {
        // 100 -> 110 over 10 periods = 10% gain
        const momPrices = [...Array(10).fill(100), 110];
        const mom = builder.calculateMomentum(momPrices, 10);
        assert.strictEqual(Math.round(mom * 100) / 100, 0.10);
    });

    it('should throw on insufficient data', () => {
        const fewTicks = createTicks([1, 2, 3]);
        assert.throws(() => builder.buildFeatures(fewTicks));
    });

    it('should match known output structure', () => {
        const features = builder.buildFeatures(ticks);
        assert.ok(typeof features.rsi === 'number');
        assert.ok(typeof features.ema_fast === 'number');
        assert.ok(typeof features.ema_slow === 'number');
        assert.ok(typeof features.atr === 'number');
        assert.ok(typeof features.momentum === 'number');
        assert.ok(typeof features.volatility === 'number');
    });
});
