import { Tick, AIInput } from '@tradermind/schemas';

type FeatureVector = AIInput['features'];

export class FeatureBuilder {
    private static readonly RSI_PERIOD = 14;
    private static readonly EMA_FAST_PERIOD = 12;
    private static readonly EMA_SLOW_PERIOD = 26;
    private static readonly ATR_PERIOD = 14;
    private static readonly MOMENTUM_PERIOD = 10;
    private static readonly VOLATILITY_PERIOD = 20;

    /**
     * Build strict feature vector from price history.
     * Guaranteed deterministic: Same prices -> Same feature vector.
     */
    public buildFeatures(input: number[] | Tick[]): FeatureVector {
        let prices: number[];

        if (input.length > 0 && typeof input[0] === 'object') {
            prices = (input as Tick[]).map(t => t.quote);
        } else {
            prices = input as number[];
        }

        if (prices.length < 50) {
            throw new Error("Insufficient data for feature calculation (need min 50 ticks)");
        }


        const rsi = this.calculateRSI(prices);
        const emaFast = this.calculateEMA(prices, FeatureBuilder.EMA_FAST_PERIOD);
        const emaSlow = this.calculateEMA(prices, FeatureBuilder.EMA_SLOW_PERIOD);

        // Ensure we pass arrays for High/Low/Close. Since we only have Quote, they are identical.
        const atr = this.calculateATR(prices, prices, prices);

        const momentum = this.calculateMomentum(prices);
        const volatility = this.calculateVolatility(prices);

        return {
            rsi: this.round(rsi),
            ema_fast: this.round(emaFast),
            ema_slow: this.round(emaSlow),
            atr: this.round(atr),
            momentum: this.round(momentum),
            volatility: this.round(volatility),
        };
    }

    private round(num: number): number {
        return Math.round(num * 10000) / 10000;
    }

    public calculateRSI(prices: number[], period: number = FeatureBuilder.RSI_PERIOD): number {
        if (prices.length < period + 1) return 50;

        let gains = 0;
        let losses = 0;

        // First average
        for (let i = 1; i <= period; i++) {
            const current = prices[i] ?? 0;
            const prev = prices[i - 1] ?? 0;
            const change = current - prev;
            if (change >= 0) gains += change;
            else losses += Math.abs(change);
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        // Smoothed averages
        for (let i = period + 1; i < prices.length; i++) {
            const current = prices[i] ?? 0;
            const prev = prices[i - 1] ?? 0;
            const change = current - prev;
            const gain = change >= 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    public calculateEMA(prices: number[], period: number): number {
        if (prices.length === 0) return 0;

        const k = 2 / (period + 1);
        let ema = prices[0] ?? 0;

        for (let i = 1; i < prices.length; i++) {
            const price = prices[i] ?? 0;
            ema = (price * k) + (ema * (1 - k));
        }

        return ema;
    }

    public calculateATR(highs: number[], lows: number[], closes: number[], period: number = FeatureBuilder.ATR_PERIOD): number {
        if (highs.length < period) return 0;

        const trs: number[] = [];

        for (let i = 1; i < highs.length; i++) {
            const high = highs[i] ?? 0;
            const low = lows[i] ?? 0;
            const prevClose = closes[i - 1] ?? 0;

            const hl = high - low;
            const hcp = Math.abs(high - prevClose);
            const lcp = Math.abs(low - prevClose);
            trs.push(Math.max(hl, hcp, lcp));
        }

        if (trs.length < period) return 0;

        // Wilder's Smoothing for ATR
        let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;

        for (let i = period; i < trs.length; i++) {
            const tr = trs[i] ?? 0;
            atr = (atr * (period - 1) + tr) / period;
        }

        return atr;
    }

    public calculateMomentum(prices: number[], period: number = FeatureBuilder.MOMENTUM_PERIOD): number {
        if (prices.length <= period) return 0;
        const current = prices[prices.length - 1] ?? 0;
        const prev = prices[prices.length - 1 - period] ?? 0;

        if (prev === 0) return 0;
        return (current - prev) / prev;
    }

    public calculateVolatility(prices: number[], period: number = FeatureBuilder.VOLATILITY_PERIOD): number {
        if (prices.length < period) return 0;

        const returns: number[] = [];
        for (let i = prices.length - period; i < prices.length; i++) {
            if (i > 0) {
                const current = prices[i] ?? 0;
                const prev = prices[i - 1] ?? 0;
                if (prev !== 0) {
                    const r = (current - prev) / prev;
                    returns.push(r);
                }
            }
        }

        if (returns.length === 0) return 0;

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;

        return Math.sqrt(variance);
    }
}
