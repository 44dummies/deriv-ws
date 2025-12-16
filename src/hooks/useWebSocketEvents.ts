import { useEffect, useRef, useState } from 'react';
import { realtimeSocket } from '../services/realtimeSocket';

interface TickUpdate {
    market: string;
    tick: number;
    time: number;
}

interface TradeUpdate {
    type: string; // 'open' or 'close'
    sessionId?: string;  // Session ID for filtering
    market: string;
    profit?: number;
    result?: string;
    timestamp: string;
    price?: number;
    side?: string;
    signal?: string;
    contractId?: string;
    payout?: number;
    stake?: number;
    digit?: number;
    exitPrice?: number;
    reason?: string;
}

interface SignalUpdate {
    sessionId?: string;  // Session ID for filtering
    market: string;
    side: string;
    digit: number;
    confidence: number;
    regime?: string; // e.g. 'TREND', 'RANGE', 'CHAOS'
    timestamp: string;
}

export const useWebSocketEvents = (sessionId: string | null, markets: string[] = ['R_100']) => {
    const [latestTick, setLatestTick] = useState<TickUpdate | null>(null);
    const [latestTrade, setLatestTrade] = useState<TradeUpdate | null>(null);
    const [latestSignal, setLatestSignal] = useState<SignalUpdate | null>(null);

    useEffect(() => {
        if (!sessionId) return;

        const token = sessionStorage.getItem('accessToken');
        if (!token) return;

        if (!realtimeSocket.isConnected()) {
            realtimeSocket.connect(token);
        }

        // Subscribe to market rooms
        markets.forEach(market => {
            realtimeSocket.emit('subscribe_market', market);
        });

        const handleTick = (data: any) => {
            setLatestTick({
                market: data.market,
                tick: data.tick,
                time: data.time
            });
        };

        const handleTrade = (data: any) => {
            // Filter by session ID to ignore events from other sessions
            if (data.sessionId && data.sessionId !== sessionId) return;
            setLatestTrade(data);
        };

        const handleSignal = (data: any) => {
            // Filter by session ID if present
            if (data.sessionId && data.sessionId !== sessionId) return;
            setLatestSignal(data);
        };

        const removeTickListener = realtimeSocket.on('tick_update', handleTick);
        const removeTradeListener = realtimeSocket.on('trade_update', handleTrade);
        const removeSignalListener = realtimeSocket.on('signal_update', handleSignal);

        return () => {
            markets.forEach(market => {
                realtimeSocket.emit('unsubscribe_market', market);
            });
            removeTickListener();
            removeTradeListener();
            removeSignalListener();
        };
    }, [sessionId, markets.join(',')]);

    return { latestTick, latestTrade, latestSignal };
};
