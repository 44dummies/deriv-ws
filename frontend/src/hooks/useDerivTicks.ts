/**
 * Real-time market tick data hook
 * Connects directly to Deriv WebSocket for live price feeds
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const APP_ID = import.meta.env.VITE_DERIV_APP_ID || '1089';

export interface TickData {
    symbol: string;
    quote: number;
    prevQuote: number;
    change: number;
    changePercent: number;
    epoch: number;
    trend: 'up' | 'down' | 'neutral';
}

export interface UseDerivTicksOptions {
    symbols: string[];
    enabled?: boolean;
}

export function useDerivTicks({ symbols, enabled = true }: UseDerivTicksOptions) {
    const [ticks, setTicks] = useState<Map<string, TickData>>(new Map());
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const subscriptionIds = useRef<Map<string, string>>(new Map());
    const prevQuotes = useRef<Map<string, number>>(new Map());

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        subscriptionIds.current.clear();
        setConnected(false);
    }, []);

    useEffect(() => {
        if (!enabled || symbols.length === 0) {
            disconnect();
            return;
        }

        // Close existing connection if any
        if (socketRef.current) {
            socketRef.current.close();
        }

        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('[DerivTicks] Connected');
            setConnected(true);
            setError(null);

            // Subscribe to each symbol
            symbols.forEach(symbol => {
                ws.send(JSON.stringify({ 
                    ticks: symbol, 
                    subscribe: 1 
                }));
            });

            // Keep-alive ping
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ ping: 1 }));
                }
            }, 30000);

            ws.addEventListener('close', () => clearInterval(pingInterval));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error('[DerivTicks] Error:', data.error.message);
                setError(data.error.message);
                return;
            }

            if (data.msg_type === 'tick') {
                const tick = data.tick;
                if (!tick) return;

                const symbol = tick.symbol;
                const quote = tick.quote;
                const epoch = tick.epoch;

                const prevQuote = prevQuotes.current.get(symbol) || quote;
                const change = quote - prevQuote;
                const changePercent = prevQuote > 0 ? (change / prevQuote) * 100 : 0;

                prevQuotes.current.set(symbol, quote);

                const tickData: TickData = {
                    symbol,
                    quote,
                    prevQuote,
                    change,
                    changePercent,
                    epoch,
                    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
                };

                setTicks(prev => {
                    const next = new Map(prev);
                    next.set(symbol, tickData);
                    return next;
                });

                // Store subscription ID if available
                if (data.subscription?.id) {
                    subscriptionIds.current.set(symbol, data.subscription.id);
                }
            }
        };

        ws.onerror = (event) => {
            console.error('[DerivTicks] WebSocket error:', event);
            setError('WebSocket connection error');
        };

        ws.onclose = () => {
            console.log('[DerivTicks] Disconnected');
            setConnected(false);
        };

        return () => {
            disconnect();
        };
    }, [symbols.join(','), enabled, disconnect]);

    const getTick = useCallback((symbol: string): TickData | undefined => {
        return ticks.get(symbol);
    }, [ticks]);

    const getAllTicks = useCallback((): TickData[] => {
        return Array.from(ticks.values());
    }, [ticks]);

    return {
        ticks,
        connected,
        error,
        getTick,
        getAllTicks,
        disconnect
    };
}

// Default markets for TraderMind
export const TRADERMIND_MARKETS = [
    'R_100', 'R_75', 'R_50', 'R_25', 'R_10',  // Volatility indices
    'JD_100', 'JD_75', 'JD_50', 'JD_25', 'JD_10'  // Jump indices
];
