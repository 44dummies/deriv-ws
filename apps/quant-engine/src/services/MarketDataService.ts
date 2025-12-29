/**
 * TraderMind MarketDataService
 * Connects to Deriv WebSocket and normalizes market data
 */

import WebSocket from 'ws';
import { EventEmitter } from 'eventemitter3';

// =============================================================================
// TYPES
// =============================================================================

export interface NormalizedTick {
    market: string;
    timestamp: number;
    quote: number;
    bid: number;
    ask: number;
    volatility: number;
    spread: number;
}

export interface RawDerivTick {
    tick: {
        symbol: string;
        quote: number;
        epoch: number;
        bid?: number;
        ask?: number;
    };
}

export interface MarketSubscription {
    market: string;
    subscriptionId: string | null;
    isActive: boolean;
}

type MarketDataEvents = {
    tick: (tick: NormalizedTick) => void;
    connected: () => void;
    disconnected: (reason: string) => void;
    error: (error: Error) => void;
    subscribed: (market: string) => void;
    unsubscribed: (market: string) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3';
const DERIV_APP_ID = process.env['DERIV_APP_ID'] ?? '1089'; // Demo app ID
const RECONNECT_DELAY_BASE = 1000;
const RECONNECT_MAX_DELAY = 30000;
const VOLATILITY_WINDOW = 20; // Number of ticks for volatility calculation

// =============================================================================
// MARKET DATA SERVICE
// =============================================================================

export class MarketDataService extends EventEmitter<MarketDataEvents> {
    private ws: WebSocket | null = null;
    private subscriptions: Map<string, MarketSubscription> = new Map();
    private tickHistory: Map<string, number[]> = new Map();
    private reconnectAttempts = 0;
    private isConnecting = false;
    private shouldReconnect = true;

    constructor() {
        super();
        console.log('[MarketDataService] Initialized');
    }

    // ---------------------------------------------------------------------------
    // CONNECTION MANAGEMENT
    // ---------------------------------------------------------------------------

    /**
     * Connect to Deriv WebSocket
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            console.log('[MarketDataService] Already connected or connecting');
            return;
        }

        this.isConnecting = true;
        this.shouldReconnect = true;
        const url = `${DERIV_WS_URL}?app_id=${DERIV_APP_ID}`;

        console.log(`[MarketDataService] Connecting to ${url}`);

        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            console.log('[MarketDataService] Connected to Deriv');
            this.emit('connected');

            // Resubscribe to markets
            for (const [market] of this.subscriptions) {
                this.subscribeToMarket(market);
            }
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
            this.handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
            this.isConnecting = false;
            console.log(`[MarketDataService] Disconnected: ${code} ${reason.toString()}`);
            this.emit('disconnected', reason.toString());

            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        });

        this.ws.on('error', (error) => {
            console.error('[MarketDataService] WebSocket error:', error.message);
            this.emit('error', error);
        });
    }

    /**
     * Disconnect from Deriv WebSocket
     */
    disconnect(): void {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close(1000, 'Intentional disconnect');
            this.ws = null;
        }
        console.log('[MarketDataService] Disconnected');
    }

    private scheduleReconnect(): void {
        const delay = Math.min(
            RECONNECT_DELAY_BASE * Math.pow(2, this.reconnectAttempts),
            RECONNECT_MAX_DELAY
        );
        this.reconnectAttempts++;

        console.log(`[MarketDataService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => {
            if (this.shouldReconnect) {
                this.connect();
            }
        }, delay);
    }

    // ---------------------------------------------------------------------------
    // SUBSCRIPTION MANAGEMENT
    // ---------------------------------------------------------------------------

    /**
     * Subscribe to a market
     */
    subscribeToMarket(market: string): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Queue subscription for when connected
            this.subscriptions.set(market, {
                market,
                subscriptionId: null,
                isActive: false,
            });
            console.log(`[MarketDataService] Queued subscription: ${market}`);
            return;
        }

        const request = {
            ticks: market,
            subscribe: 1,
        };

        this.ws.send(JSON.stringify(request));
        this.subscriptions.set(market, {
            market,
            subscriptionId: null,
            isActive: true,
        });
        this.tickHistory.set(market, []);

        console.log(`[MarketDataService] Subscribed to: ${market}`);
        this.emit('subscribed', market);
    }

    /**
     * Unsubscribe from a market
     */
    unsubscribeFromMarket(market: string): void {
        const subscription = this.subscriptions.get(market);
        if (!subscription) return;

        if (this.ws?.readyState === WebSocket.OPEN && subscription.subscriptionId) {
            this.ws.send(JSON.stringify({
                forget: subscription.subscriptionId,
            }));
        }

        this.subscriptions.delete(market);
        this.tickHistory.delete(market);
        console.log(`[MarketDataService] Unsubscribed from: ${market}`);
        this.emit('unsubscribed', market);
    }

    /**
     * Subscribe to default markets (R_100, R_50)
     */
    subscribeToDefaultMarkets(): void {
        this.subscribeToMarket('R_100');
        this.subscribeToMarket('R_50');
    }

    // ---------------------------------------------------------------------------
    // MESSAGE HANDLING
    // ---------------------------------------------------------------------------

    private handleMessage(data: WebSocket.RawData): void {
        try {
            const message = JSON.parse(data.toString()) as Record<string, unknown>;

            // Handle tick data
            if (message['tick']) {
                const rawTick = message as unknown as RawDerivTick;
                const normalizedTick = this.normalizeTick(rawTick);
                this.emit('tick', normalizedTick);
            }

            // Handle subscription confirmation
            if (message['subscription']) {
                const sub = message['subscription'] as { id: string };
                const symbol = (message['tick'] as { symbol: string } | undefined)?.symbol;
                if (symbol) {
                    const subscription = this.subscriptions.get(symbol);
                    if (subscription) {
                        subscription.subscriptionId = sub.id;
                    }
                }
            }

            // Handle errors
            if (message['error']) {
                const error = message['error'] as { message: string };
                console.error('[MarketDataService] API error:', error.message);
                this.emit('error', new Error(error.message));
            }
        } catch (err) {
            console.error('[MarketDataService] Failed to parse message:', err);
        }
    }

    // ---------------------------------------------------------------------------
    // DATA NORMALIZATION
    // ---------------------------------------------------------------------------

    private normalizeTick(raw: RawDerivTick): NormalizedTick {
        const { tick } = raw;
        const market = tick.symbol;
        const quote = tick.quote;
        const timestamp = tick.epoch * 1000;

        // Synthetic markets don't have bid/ask, calculate from quote
        const spread = quote * 0.0001; // 0.01% spread estimate
        const bid = tick.bid ?? quote - spread / 2;
        const ask = tick.ask ?? quote + spread / 2;

        // Calculate rolling volatility
        const volatility = this.calculateVolatility(market, quote);

        return {
            market,
            timestamp,
            quote,
            bid,
            ask,
            volatility,
            spread: ask - bid,
        };
    }

    private calculateVolatility(market: string, quote: number): number {
        const history = this.tickHistory.get(market) ?? [];
        history.push(quote);

        // Keep only last N ticks
        if (history.length > VOLATILITY_WINDOW) {
            history.shift();
        }

        this.tickHistory.set(market, history);

        // Need at least 2 ticks for volatility
        if (history.length < 2) {
            return 0;
        }

        // Calculate returns
        const returns: number[] = [];
        for (let i = 1; i < history.length; i++) {
            const current = history[i];
            const previous = history[i - 1];
            if (current !== undefined && previous !== undefined && previous !== 0) {
                returns.push(Math.log(current / previous));
            }
        }

        // Calculate standard deviation of returns
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        // Annualize (assuming 1-second ticks, ~31 million ticks/year)
        return stdDev * Math.sqrt(31536000);
    }

    // ---------------------------------------------------------------------------
    // UTILITIES
    // ---------------------------------------------------------------------------

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Check if service is healthy (connected and running)
     */
    isHealthy(): boolean {
        return this.isConnected();
    }

    /**
     * Get active subscriptions
     */
    getSubscriptions(): string[] {
        return Array.from(this.subscriptions.keys());
    }

    /**
     * Get service stats
     */
    getStats(): { connected: boolean; subscriptions: number; markets: string[] } {
        return {
            connected: this.isConnected(),
            subscriptions: this.subscriptions.size,
            markets: this.getSubscriptions(),
        };
    }
}

// Export singleton instance
export const marketDataService = new MarketDataService();
