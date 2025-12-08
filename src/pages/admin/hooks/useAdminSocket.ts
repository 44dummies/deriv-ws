/**
 * Admin WebSocket Hook
 * Real-time updates for admin dashboard
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'https://tradermind-server.up.railway.app';

interface BotStatus {
    isRunning: boolean;
    uptime?: number;
    tradesExecuted?: number;
    lastTrade?: string;
}

interface TradeAlert {
    id: string;
    sessionId: string;
    type: string;
    result: 'win' | 'loss';
    profit: number;
    timestamp: string;
}

interface LiveStats {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    activeUsers: number;
}

interface AdminSocketState {
    connected: boolean;
    botStatus: BotStatus | null;
    liveStats: LiveStats | null;
    tradeAlerts: TradeAlert[];
    sessionUpdates: any[];
}

export function useAdminSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [state, setState] = useState<AdminSocketState>({
        connected: false,
        botStatus: null,
        liveStats: null,
        tradeAlerts: [],
        sessionUpdates: []
    });

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        const token = sessionStorage.getItem('accessToken');

        const socket = io(SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('[AdminSocket] Connected');
            setState(prev => ({ ...prev, connected: true }));

            // Join admin room
            socket.emit('admin:join');
        });

        socket.on('disconnect', () => {
            console.log('[AdminSocket] Disconnected');
            setState(prev => ({ ...prev, connected: false }));
        });

        // Bot status updates
        socket.on('bot:status', (data: BotStatus) => {
            setState(prev => ({ ...prev, botStatus: data }));
        });

        // Live stats updates
        socket.on('stats:live', (data: LiveStats) => {
            setState(prev => ({ ...prev, liveStats: data }));
        });

        // Trade alerts
        socket.on('trade:alert', (data: TradeAlert) => {
            setState(prev => ({
                ...prev,
                tradeAlerts: [data, ...prev.tradeAlerts].slice(0, 50) // Keep last 50
            }));
        });

        // Session updates
        socket.on('session:update', (data: any) => {
            setState(prev => ({
                ...prev,
                sessionUpdates: [data, ...prev.sessionUpdates].slice(0, 20)
            }));
        });

        socket.on('error', (error: any) => {
            console.error('[AdminSocket] Error:', error);
        });

        socketRef.current = socket;
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.emit('admin:leave');
            socketRef.current.disconnect();
            socketRef.current = null;
            setState(prev => ({ ...prev, connected: false }));
        }
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        }
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        ...state,
        connect,
        disconnect,
        emit
    };
}

/**
 * Hook for polling live stats when WebSocket is not available
 */
export function useLiveStats(pollInterval = 30000) {
    const [stats, setStats] = useState<LiveStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch(`${SOCKET_URL}/api/admin/stats/live`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('accessToken')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch live stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, pollInterval);
        return () => clearInterval(interval);
    }, [fetchStats, pollInterval]);

    return { stats, loading, refresh: fetchStats };
}
