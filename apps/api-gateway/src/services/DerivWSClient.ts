/**
 * TraderMind Deriv WebSocket Client
 * Handles connection, subscriptions, heartbeat, and circuit breaker
 */

import WebSocket from 'ws';
import { EventEmitter } from 'eventemitter3';

// =============================================================================
// TYPES
// =============================================================================

export interface Tick {
    market: string;
    bid: number;
    ask: number;
    quote: number;
    timestamp: string;
    epoch: number;
}

export interface DerivTickMessage {
    tick?: {
        symbol: string;
        quote: number;
        bid?: number;
        ask?: number;
        epoch: number;
    };
    subscription?: { id: string };
    error?: { message: string; code: string };
    ping?: string;
    pong?: string;
    msg_type?: string;
}

export interface SubscriptionInfo {
    market: string;
    subscriptionId: string | null;
    isActive: boolean;
    lastTickEpoch: number;
}

type DerivWSEvents = {
    tick: (tick: Tick) => void;
    connected: () => void;
    disconnected: (reason: string) => void;
    error: (error: Error) => void;
    subscribed: (market: string) => void;
    unsubscribed: (market: string) => void;
    circuitBreaker: (reason: string) => void;
    heartbeat: (latency: number) => void;
    settled: (contractId: number, result: 'win' | 'loss', profit: number) => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3';
const DERIV_APP_ID = process.env['DERIV_APP_ID'] ?? '114042'; // Partner App ID
const HEARTBEAT_INTERVAL = 10000;
const HEARTBEAT_TIMEOUT = 15000;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const CIRCUIT_BREAKER_WINDOW = 30000;
const CIRCUIT_BREAKER_THRESHOLD = 5;

// =============================================================================
// DERIV WS CLIENT
// =============================================================================

// =============================================================================
// DERIV WS CLIENT
// =============================================================================

export interface IDerivClient {
    authorize(token: string): Promise<boolean>;
    subscribeTicks(market: string): void;
    unsubscribeTicks(market: string): void;
    buyContract(parameters: any): Promise<any>;
    sellContract(contractId: number, price: number): Promise<any>;
    cancelContract(contractId: number): Promise<any>;
}

export enum DerivErrorCode {
    AUTHORIZATION_REQUIRED = 'AuthorizationRequired',
    INVALID_TOKEN = 'InvalidToken',
    MARKET_CLOSED = 'MarketClosed',
    INSUFFICIENT_BALANCE = 'InsufficientBalance',
    UNKNOWN = 'Unknown',
}

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    timeout: NodeJS.Timeout;
}

export class DerivWSClient extends EventEmitter<DerivWSEvents> implements IDerivClient {
    private ws: WebSocket | null = null;
    private subscriptions: Map<string, SubscriptionInfo> = new Map();
    private isConnecting = false;
    private shouldReconnect = true;
    private reconnectAttempts = 0;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
    private lastPingSent = 0;
    private failureTimestamps: number[] = [];
    private circuitOpen = false;

    // Request/Response handling
    private nextReqId = 1;
    private pendingRequests: Map<number, PendingRequest> = new Map();

    constructor() {
        super();
        console.log('[DerivWSClient] Initialized');
    }

    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            console.log('[DerivWSClient] Already connected or connecting');
            return;
        }

        if (this.circuitOpen) {
            console.log('[DerivWSClient] Circuit breaker is open, cannot connect');
            return;
        }

        this.isConnecting = true;
        this.shouldReconnect = true;
        const url = `${DERIV_WS_URL}?app_id=${DERIV_APP_ID}`;

        console.log(`[DerivWSClient] Connecting to ${url}`);
        this.ws = new WebSocket(url);

        this.ws.on('open', () => this.handleOpen());

        this.ws.on('message', (data: WebSocket.RawData) => this.handleMessage(data));
        this.ws.on('close', (code: number, reason: Buffer) => this.handleClose(code, reason));
        this.ws.on('error', (error: Error) => this.handleError(error));
    }



    disconnect(): void {
        this.shouldReconnect = false;
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close(1000, 'Intentional disconnect');
            this.ws = null;
        }
        this.subscriptions.clear();
        this.pendingRequests.forEach((req) => {
            clearTimeout(req.timeout);
            req.reject(new Error('Disconnected'));
        });
        this.pendingRequests.clear();
        console.log('[DerivWSClient] Disconnected');
    }

    // --- Settlement Monitoring ---

    async monitorContract(contractId: number | string): Promise<void> {
        if (!this.isConnected()) throw new Error('Not connected');

        console.log(`[DerivWSClient] Monitoring contract: ${contractId}`);

        // Subscribe to proposal_open_contract
        const payload = {
            proposal_open_contract: 1,
            contract_id: contractId,
            subscribe: 1
        };

        await this.sendRequest(payload);
    }

    // --- IDerivClient Implementation ---

    async authorize(token: string): Promise<boolean> {
        if (!this.isConnected()) throw new Error('Not connected');

        try {
            const response = await this.sendRequest({ authorize: token });
            if (response.error) {
                console.error('[DerivWSClient] Auth failed:', response.error);
                return false;
            }
            console.log('[DerivWSClient] Authorized successfully');
            return true;
        } catch (err) {
            console.error('[DerivWSClient] Auth error:', err);
            return false;
        }
    }

    subscribeTicks(market: string): void {
        this.subscribe(market);
    }

    unsubscribeTicks(market: string): void {
        this.unsubscribe(market);
    }

    async buyContract(parameters: any): Promise<any> {
        // Strict contract: parameters must be object
        if (!this.isConnected()) throw new Error('Not connected');

        // Force buy: 1
        const payload = { ...parameters, buy: 1 };

        try {
            const response = await this.sendRequest(payload);

            if (response.error) {
                // Map Error
                const code = this.mapErrorCode(response.error.code);
                console.error(`[DerivWSClient] Buy failed: ${code} - ${response.error.message}`);
                throw new Error(`${code}: ${response.error.message}`);
            }

            // Lock: Normalize response
            if (!response.buy) {
                throw new Error('Invalid Deriv response: missing "buy" field');
            }

            return {
                contract_id: response.buy.contract_id,
                longcode: response.buy.longcode,
                buy_price: response.buy.buy_price,
                start_time: response.buy.start_time,
                transaction_id: response.buy.transaction_id
            };
        } catch (err: any) {
            // Ensure we don't leak raw objects if something weird happens
            throw new Error(err.message || 'Unknown Buy Error');
        }
    }

    async sellContract(contractId: number, price: number): Promise<any> {
        if (!this.isConnected()) throw new Error('Not connected');

        const payload = { sell: contractId, price };
        console.log(`[DerivWSClient] Selling contract ${contractId} at ${price}`);

        try {
            const response = await this.sendRequest(payload);
            if (response.error) {
                const code = this.mapErrorCode(response.error.code);
                console.error(`[DerivWSClient] Sell failed: ${code} - ${response.error.message}`);
                throw new Error(`${code}: ${response.error.message}`);
            }
            return response.sell;
        } catch (err: any) {
            throw new Error(err.message || 'Unknown Sell Error');
        }
    }

    async cancelContract(contractId: number): Promise<any> {
        if (!this.isConnected()) throw new Error('Not connected');

        const payload = { cancel: contractId };
        console.log(`[DerivWSClient] Cancelling contract ${contractId}`);

        try {
            const response = await this.sendRequest(payload);
            if (response.error) {
                const code = this.mapErrorCode(response.error.code);
                console.error(`[DerivWSClient] Cancel failed: ${code} - ${response.error.message}`);
                throw new Error(`${code}: ${response.error.message}`);
            }
            return response.cancel;
        } catch (err: any) {
            throw new Error(err.message || 'Unknown Cancel Error');
        }
    }

    // --- Internal Request Handling ---

    private sendRequest(payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.ws?.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not open'));
                return;
            }

            const reqId = this.nextReqId++;
            const request = { ...payload, req_id: reqId };

            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(reqId)) {
                    this.pendingRequests.delete(reqId);
                    reject(new Error('Request timeout'));
                }
            }, 10000); // 10s timeout

            this.pendingRequests.set(reqId, { resolve, reject, timeout });
            this.ws.send(JSON.stringify(request));
        });
    }

    private mapErrorCode(derivCode: string): DerivErrorCode {
        switch (derivCode) {
            case 'AuthorizationRequired': return DerivErrorCode.AUTHORIZATION_REQUIRED;
            case 'InvalidToken': return DerivErrorCode.INVALID_TOKEN;
            case 'MarketIsClosed': return DerivErrorCode.MARKET_CLOSED;
            case 'InsufficientBalance': return DerivErrorCode.INSUFFICIENT_BALANCE;
            default: return DerivErrorCode.UNKNOWN;
        }
    }

    // --- WebSocket Handlers ---

    private handleOpen(): void {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.failureTimestamps = [];
        console.log('[DerivWSClient] Connected');
        this.emit('connected');
        this.startHeartbeat();
        // Resubscribe logic is handled by caller or we can iterate subscriptions here if needed, 
        // but for now we rely on explicit calls or session restoration.
        // Actually, existing logic re-subscribes:
        for (const [market] of this.subscriptions) {
            this.subscribe(market);
        }
    }

    private handleClose(code: number, reason: Buffer): void {
        this.isConnecting = false;
        this.stopHeartbeat();
        console.log(`[DerivWSClient] Disconnected: ${code} ${reason.toString()}`);
        this.emit('disconnected', reason.toString());

        // Reject all pending
        this.pendingRequests.forEach((req) => {
            clearTimeout(req.timeout);
            req.reject(new Error('Connection closed'));
        });
        this.pendingRequests.clear();

        if (this.shouldReconnect) {
            this.recordFailure();
            this.scheduleReconnect();
        }
    }

    private handleError(error: Error): void {
        console.error('[DerivWSClient] WebSocket error:', error.message);
        this.emit('error', error);
    }

    private scheduleReconnect(): void {
        if (this.circuitOpen) return;
        const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts), RECONNECT_MAX_DELAY);
        this.reconnectAttempts++;
        console.log(`[DerivWSClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => {
            if (this.shouldReconnect && !this.circuitOpen) this.connect();
        }, delay);
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => this.sendPing(), HEARTBEAT_INTERVAL);
        this.sendPing();
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
        if (this.heartbeatTimeoutTimer) { clearTimeout(this.heartbeatTimeoutTimer); this.heartbeatTimeoutTimer = null; }
    }

    private sendPing(): void {
        // Ping does not use req_id in this implementation usually, but we can if we want to track it.
        // Standard Deriv Ping: { ping: 1 } -> { pong: 1 } (no req_id needed usually)
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        this.lastPingSent = Date.now();
        this.ws.send(JSON.stringify({ ping: 1 }));
        this.heartbeatTimeoutTimer = setTimeout(() => {
            console.log('[DerivWSClient] Heartbeat timeout, reconnecting');
            this.ws?.close(4000, 'Heartbeat timeout');
        }, HEARTBEAT_TIMEOUT);
    }

    private handlePong(): void {
        if (this.heartbeatTimeoutTimer) { clearTimeout(this.heartbeatTimeoutTimer); this.heartbeatTimeoutTimer = null; }
        this.emit('heartbeat', Date.now() - this.lastPingSent);
    }

    private recordFailure(): void {
        const now = Date.now();
        this.failureTimestamps.push(now);
        this.failureTimestamps = this.failureTimestamps.filter(ts => now - ts < CIRCUIT_BREAKER_WINDOW);
        if (this.failureTimestamps.length >= CIRCUIT_BREAKER_THRESHOLD) this.tripCircuitBreaker();
    }

    private tripCircuitBreaker(): void {
        this.circuitOpen = true;
        this.shouldReconnect = false;
        const reason = `${CIRCUIT_BREAKER_THRESHOLD} failures in ${CIRCUIT_BREAKER_WINDOW / 1000}s`;
        console.log(`[DerivWSClient] Circuit breaker tripped: ${reason}`);
        this.emit('circuitBreaker', reason);
        setTimeout(() => this.resetCircuitBreaker(), CIRCUIT_BREAKER_WINDOW);
    }

    resetCircuitBreaker(): void {
        this.circuitOpen = false;
        this.failureTimestamps = [];
        this.reconnectAttempts = 0;
        console.log('[DerivWSClient] Circuit breaker reset');
    }

    isCircuitOpen(): boolean { return this.circuitOpen; }

    subscribe(market: string): void {
        if (this.subscriptions.has(market) && this.subscriptions.get(market)?.isActive) return;
        this.subscriptions.set(market, { market, subscriptionId: null, isActive: false, lastTickEpoch: 0 });
        if (this.ws?.readyState !== WebSocket.OPEN) {
            console.log(`[DerivWSClient] Queued subscription: ${market}`);
            return;
        }
        // Subscriptions usually don't need req_id correlation for ticks, but good practice.
        this.ws.send(JSON.stringify({ ticks: market, subscribe: 1 }));
        console.log(`[DerivWSClient] Subscribing to: ${market}`);
    }

    unsubscribe(market: string): void {
        const sub = this.subscriptions.get(market);
        if (!sub) return;
        if (this.ws?.readyState === WebSocket.OPEN && sub.subscriptionId) {
            this.ws.send(JSON.stringify({ forget: sub.subscriptionId }));
        }
        this.subscriptions.delete(market);
        console.log(`[DerivWSClient] Unsubscribed from: ${market}`);
        this.emit('unsubscribed', market);
    }

    getSubscriptions(): string[] { return Array.from(this.subscriptions.keys()); }

    private handleMessage(data: WebSocket.RawData): void {
        try {
            const message = JSON.parse(data.toString()) as any; // Cast to any to handle various shapes structure

            // 1. Settlement Handling (proposal_open_contract)
            if (message.msg_type === 'proposal_open_contract') {
                const contract = message.proposal_open_contract;
                if (contract.is_sold) {
                    const profit = contract.profit;
                    const result = profit >= 0 ? 'win' : 'loss';
                    console.log(`[DerivWSClient] Contract ${contract.contract_id} settled: ${result} (${profit})`);
                    this.emit('settled', contract.contract_id, result, profit);
                }
                return;
            }

            // 2. Check Request ID (Response to a specific request)
            if (message.req_id) {
                const req = this.pendingRequests.get(message.req_id);
                if (req) {
                    clearTimeout(req.timeout);
                    this.pendingRequests.delete(message.req_id);
                    req.resolve(message);
                    return; // Handled
                }
            }

            // 2. Standard Event Handling
            if (message.msg_type === 'pong' || message.pong) { this.handlePong(); return; }
            if (message.tick) { this.handleTick(message); return; }

            // 3. Subscription confirmations (might not have req_id if initiated purely by subscribe method without promise)
            // But if we used sendRequest, it would be handled above.

            if (message.error) {
                // If it had a req_id, it was handled above (resolve({error:...})).
                // If NO req_id, it's a general stream error.
                if (!message.req_id) {
                    console.error(`[DerivWSClient] Stream error: ${message.error.message}`);
                    this.emit('error', new Error(message.error.message));
                }
            }

        } catch (err) {
            console.error('[DerivWSClient] Failed to parse message:', err);
        }
    }

    private handleTick(message: DerivTickMessage): void {
        const tickData = message.tick;
        if (!tickData) return;

        const { symbol, quote, bid, ask, epoch } = tickData;
        const sub = this.subscriptions.get(symbol);

        // Deduplicate by epoch
        if (sub && epoch <= sub.lastTickEpoch) return;

        if (sub) {
            sub.lastTickEpoch = epoch;
            sub.isActive = true;
            if (message.subscription?.id) sub.subscriptionId = message.subscription.id;
            if (!sub.subscriptionId && message.subscription?.id) {
                console.log(`[DerivWSClient] Subscribed to ${symbol}`);
                this.emit('subscribed', symbol);
            }
        }

        const spread = quote * 0.0001;
        const tick: Tick = {
            market: symbol,
            quote,
            bid: bid ?? quote - spread / 2,
            ask: ask ?? quote + spread / 2,
            timestamp: new Date(epoch * 1000).toISOString(),
            epoch,
        };
        this.emit('tick', tick);
    }

    isConnected(): boolean { return this.ws?.readyState === WebSocket.OPEN; }

    getStats(): { connected: boolean; subscriptions: number; circuitOpen: boolean; reconnectAttempts: number } {
        return {
            connected: this.isConnected(),
            subscriptions: this.subscriptions.size,
            circuitOpen: this.circuitOpen,
            reconnectAttempts: this.reconnectAttempts,
        };
    }
}

export const derivWSClient = new DerivWSClient();
