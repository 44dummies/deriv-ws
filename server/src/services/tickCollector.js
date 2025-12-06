/**
 * Tick Collector Service
 * Real-time WebSocket connection to Deriv for tick streaming
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089';

// Available volatility indices
const VOLATILITY_INDICES = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'];

class TickCollector extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 5000;

        // Store last 100 ticks per market
        this.tickHistory = {};
        VOLATILITY_INDICES.forEach(market => {
            this.tickHistory[market] = [];
        });

        // Subscription tracking
        this.subscriptions = new Set();
        this.subscriptionIds = new Map();
    }

    /**
     * Connect to Deriv WebSocket
     */
    async connect() {
        return new Promise((resolve, reject) => {
            if (this.ws && this.isConnected) {
                resolve();
                return;
            }

            this.ws = new WebSocket(DERIV_WS_URL);

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 30000);

            this.ws.on('open', () => {
                clearTimeout(timeout);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('[TickCollector] Connected to Deriv WebSocket');
                this.emit('connected');
                resolve();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                console.log('[TickCollector] WebSocket closed');
                this.emit('disconnected');
                this.attemptReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('[TickCollector] WebSocket error:', error.message);
                this.emit('error', error);
            });
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());

            if (message.tick) {
                const tick = message.tick;
                const market = tick.symbol;

                // Add to history
                if (this.tickHistory[market]) {
                    this.tickHistory[market].push({
                        epoch: tick.epoch,
                        quote: tick.quote,
                        timestamp: new Date().toISOString()
                    });

                    // Keep only last 100 ticks
                    if (this.tickHistory[market].length > 100) {
                        this.tickHistory[market].shift();
                    }

                    // Extract last digit and emit tick event
                    const priceStr = tick.quote.toString();
                    const lastDigit = parseInt(priceStr[priceStr.length - 1]);

                    this.emit('tick', {
                        market,
                        quote: tick.quote,
                        epoch: tick.epoch,
                        lastDigit,
                        history: this.tickHistory[market]
                    });
                }
            }

            if (message.subscription) {
                this.subscriptionIds.set(message.subscription.symbol, message.subscription.id);
            }

            if (message.error) {
                console.error('[TickCollector] API Error:', message.error);
                this.emit('api_error', message.error);
            }
        } catch (error) {
            console.error('[TickCollector] Parse error:', error);
        }
    }

    /**
     * Subscribe to tick stream for a market
     */
    subscribeToMarket(market) {
        if (!this.isConnected || !this.ws) {
            console.error('[TickCollector] Cannot subscribe: not connected');
            return false;
        }

        if (this.subscriptions.has(market)) {
            console.log(`[TickCollector] Already subscribed to ${market}`);
            return true;
        }

        this.ws.send(JSON.stringify({
            ticks: market,
            subscribe: 1
        }));

        this.subscriptions.add(market);
        console.log(`[TickCollector] Subscribed to ${market}`);
        return true;
    }

    /**
     * Subscribe to multiple markets
     */
    subscribeToMarkets(markets = VOLATILITY_INDICES) {
        markets.forEach(market => {
            this.subscribeToMarket(market);
        });
    }

    /**
     * Unsubscribe from a market
     */
    unsubscribeFromMarket(market) {
        const subId = this.subscriptionIds.get(market);
        if (subId && this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
                forget: subId
            }));
            this.subscriptions.delete(market);
            this.subscriptionIds.delete(market);
            console.log(`[TickCollector] Unsubscribed from ${market}`);
        }
    }

    /**
     * Unsubscribe from all markets
     */
    unsubscribeAll() {
        for (const market of this.subscriptions) {
            this.unsubscribeFromMarket(market);
        }
    }

    /**
     * Get tick history for a market
     */
    getTickHistory(market) {
        return this.tickHistory[market] || [];
    }

    /**
     * Get digit statistics for a market
     */
    getDigitStats(market) {
        const ticks = this.tickHistory[market] || [];
        if (ticks.length === 0) return null;

        const counts = new Array(10).fill(0);
        const digits = ticks.map(t => {
            const priceStr = t.quote.toString();
            return parseInt(priceStr[priceStr.length - 1]);
        });

        digits.forEach(d => counts[d]++);

        return {
            counts,
            frequencies: counts.map(c => c / digits.length),
            lastDigit: digits[digits.length - 1],
            recentDigits: digits.slice(-20),
            totalTicks: ticks.length
        };
    }

    /**
     * Attempt reconnection
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[TickCollector] Max reconnect attempts reached');
            this.emit('max_reconnect_reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`[TickCollector] Reconnecting... (attempt ${this.reconnectAttempts})`);

        setTimeout(async () => {
            try {
                await this.connect();
                // Resubscribe to previous markets
                for (const market of this.subscriptions) {
                    this.subscribeToMarket(market);
                }
            } catch (error) {
                console.error('[TickCollector] Reconnect failed:', error);
                this.attemptReconnect();
            }
        }, this.reconnectDelay);
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        this.unsubscribeAll();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        console.log('[TickCollector] Disconnected');
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            subscribedMarkets: Array.from(this.subscriptions),
            tickCounts: Object.fromEntries(
                Object.entries(this.tickHistory).map(([k, v]) => [k, v.length])
            )
        };
    }
}

// Singleton instance
const tickCollector = new TickCollector();

module.exports = {
    TickCollector,
    tickCollector,
    VOLATILITY_INDICES
};
