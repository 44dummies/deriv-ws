/**
 * useSessionManagement Hook
 * Manages session data, WebSocket updates, and CRUD operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    ManagedSession,
    SessionFilters,
    SessionAlert,
    TradeInfo,
    SessionAnalytics,
    BulkOperation
} from '../types/session';
import { tradingApi } from '../trading/tradingApi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface UseSessionManagementReturn {
    sessions: ManagedSession[];
    filteredSessions: ManagedSession[];
    selectedSession: ManagedSession | null;
    alerts: SessionAlert[];
    loading: boolean;
    error: string | null;
    connected: boolean;
    filters: SessionFilters;
    setFilters: (filters: SessionFilters) => void;
    selectSession: (sessionId: string | null) => void;
    refreshSessions: () => Promise<void>;
    startSession: (sessionId: string) => Promise<boolean>;
    pauseSession: (sessionId: string) => Promise<boolean>;
    resumeSession: (sessionId: string) => Promise<boolean>;
    stopSession: (sessionId: string) => Promise<boolean>;
    updateTPSL: (sessionId: string, tp: number, sl: number) => Promise<boolean>;
    bulkOperation: (op: BulkOperation) => Promise<boolean>;
    acknowledgeAlert: (alertId: string) => void;
    clearAlerts: () => void;
}

export function useSessionManagement(): UseSessionManagementReturn {
    const [sessions, setSessions] = useState<ManagedSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [alerts, setAlerts] = useState<SessionAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [filters, setFilters] = useState<SessionFilters>({
        accountType: 'all',
        status: 'all',
        symbol: 'all',
        strategy: 'all',
        search: '',
        sortBy: 'startTime',
        sortOrder: 'desc'
    });

    const socketRef = useRef<Socket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    // Initialize WebSocket connection
    useEffect(() => {
        const token = sessionStorage.getItem('accessToken');
        if (!token) return;

        const socket = io(API_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            reconnectAttemptsRef.current = 0;
            console.log('[SessionManager] WebSocket connected');

            // Subscribe to session updates
            socket.emit('subscribe_sessions');
        });

        socket.on('disconnect', () => {
            setConnected(false);
            console.log('[SessionManager] WebSocket disconnected');
        });

        socket.on('connect_error', (err) => {
            reconnectAttemptsRef.current++;
            if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                setError('Failed to connect to server. Please refresh the page.');
            }
        });

        // Session update events
        socket.on('session_update', (data: { sessionId: string; updates: Partial<ManagedSession> }) => {
            setSessions(prev => prev.map(s =>
                s.id === data.sessionId ? { ...s, ...data.updates, lastUpdate: new Date().toISOString() } : s
            ));
        });

        // Trade update events
        socket.on('trade_update', (data: { sessionId: string; trade: TradeInfo; action: string }) => {
            setSessions(prev => prev.map(s => {
                if (s.id !== data.sessionId) return s;

                let updatedTrades = [...s.trades];
                let updatedOpenTrades = [...s.openTrades];

                if (data.action === 'open') {
                    updatedTrades.push(data.trade);
                    updatedOpenTrades.push(data.trade);
                } else if (data.action === 'close') {
                    updatedOpenTrades = updatedOpenTrades.filter(t => t.id !== data.trade.id);
                    updatedTrades = updatedTrades.map(t => t.id === data.trade.id ? data.trade : t);
                }

                // Recalculate PnL
                const pnl = updatedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);

                return {
                    ...s,
                    trades: updatedTrades,
                    openTrades: updatedOpenTrades,
                    pnl,
                    lastUpdate: new Date().toISOString()
                };
            }));

            // Add alert for trade result
            if (data.action === 'close' && data.trade.profit !== undefined) {
                const alert: SessionAlert = {
                    id: `alert-${Date.now()}`,
                    sessionId: data.sessionId,
                    type: data.trade.profit >= 0 ? 'profit' : 'loss',
                    title: data.trade.profit >= 0 ? 'Trade Won!' : 'Trade Lost',
                    message: `${data.trade.type} ${data.trade.symbol}: ${data.trade.profit >= 0 ? '+' : ''}$${data.trade.profit.toFixed(2)}`,
                    timestamp: new Date().toISOString(),
                    acknowledged: false,
                    soundPlayed: false
                };
                setAlerts(prev => [alert, ...prev].slice(0, 100));
            }
        });

        // Alert events
        socket.on('session_alert', (alert: SessionAlert) => {
            setAlerts(prev => [alert, ...prev].slice(0, 100));
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    // Fetch sessions
    const refreshSessions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await tradingApi.getSessions();
            // Handle potential response formats (array or object wrapper)
            const data = Array.isArray(response) ? response : (response.data || response.sessions || []);

            if (Array.isArray(data)) {
                // Transform to ManagedSession format
                const managedSessions: ManagedSession[] = data.map((s: any) => ({
                    id: s.id,
                    name: s.name || 'Unnamed Session',
                    userId: s.created_by || s.user_id,
                    accountId: s.account_id || '',
                    accountType: s.account_type || 'demo',
                    status: s.status || 'pending',
                    symbols: s.markets || ['R_100'],
                    balance: s.current_balance || 0,
                    startingBalance: s.starting_balance || 0,
                    pnl: s.pnl || 0,
                    startTime: s.created_at || new Date().toISOString(),
                    duration: s.duration || 0,
                    trades: s.trades || [],
                    openTrades: s.open_trades || [],
                    tp: s.default_tp || 10,
                    sl: s.default_sl || 5,
                    currentExposure: s.exposure || 0,
                    strategy: s.strategy,
                    analytics: s.analytics || {
                        totalTrades: 0,
                        wins: 0,
                        losses: 0,
                        winRate: 0,
                        totalProfit: 0,
                        totalStake: 0,
                        averageProfit: 0,
                        largestWin: 0,
                        largestLoss: 0,
                        maxDrawdown: 0,
                        currentStreak: 0,
                        streakType: 'none',
                        profitFactor: 0,
                        averageTradeDuration: 0
                    },
                    lastUpdate: new Date().toISOString()
                }));
                setSessions(managedSessions);
            }
        } catch (err) {
            setError('Failed to load sessions');
            console.error('Error loading sessions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        refreshSessions();
    }, [refreshSessions]);

    // Filter and sort sessions
    const filteredSessions = sessions.filter(s => {
        if (filters.accountType !== 'all' && s.accountType !== filters.accountType) return false;
        if (filters.status !== 'all' && s.status !== filters.status) return false;
        if (filters.symbol !== 'all' && !s.symbols.includes(filters.symbol!)) return false;
        if (filters.strategy !== 'all' && s.strategy !== filters.strategy) return false;
        if (filters.search) {
            const search = filters.search.toLowerCase();
            if (!s.id.toLowerCase().includes(search) &&
                !s.name.toLowerCase().includes(search) &&
                !(s.userName?.toLowerCase().includes(search))) {
                return false;
            }
        }
        return true;
    }).sort((a, b) => {
        const order = filters.sortOrder === 'asc' ? 1 : -1;
        switch (filters.sortBy) {
            case 'pnl': return (a.pnl - b.pnl) * order;
            case 'startTime': return (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) * order;
            case 'duration': return (a.duration - b.duration) * order;
            case 'trades': return (a.trades.length - b.trades.length) * order;
            case 'balance': return (a.balance - b.balance) * order;
            default: return 0;
        }
    });

    const selectedSession = sessions.find(s => s.id === selectedSessionId) || null;

    // Session control actions
    const startSession = async (sessionId: string): Promise<boolean> => {
        try {
            await tradingApi.startBot(sessionId);
            return true;
        } catch (err) {
            console.error('Failed to start session:', err);
            return false;
        }
    };

    const pauseSession = async (sessionId: string): Promise<boolean> => {
        try {
            await tradingApi.pauseBot();
            return true;
        } catch (err) {
            console.error('Failed to pause session:', err);
            return false;
        }
    };

    const resumeSession = async (sessionId: string): Promise<boolean> => {
        try {
            await tradingApi.resumeBot();
            return true;
        } catch (err) {
            console.error('Failed to resume session:', err);
            return false;
        }
    };

    const stopSession = async (sessionId: string): Promise<boolean> => {
        try {
            await tradingApi.stopBot();
            return true;
        } catch (err) {
            console.error('Failed to stop session:', err);
            return false;
        }
    };

    const updateTPSL = async (sessionId: string, tp: number, sl: number): Promise<boolean> => {
        try {
            await tradingApi.updateUserTPSL({ sessionId, takeProfit: tp, stopLoss: sl });
            setSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, tp, sl } : s
            ));
            return true;
        } catch (err) {
            console.error('Failed to update TP/SL:', err);
            return false;
        }
    };

    const bulkOperation = async (op: BulkOperation): Promise<boolean> => {
        try {
            const results = await Promise.all(
                op.sessionIds.map(id => {
                    switch (op.action) {
                        case 'start': return startSession(id);
                        case 'pause': return pauseSession(id);
                        case 'resume': return resumeSession(id);
                        case 'stop': return stopSession(id);
                    }
                })
            );
            return results.every(r => r);
        } catch (err) {
            console.error('Bulk operation failed:', err);
            return false;
        }
    };

    const acknowledgeAlert = (alertId: string) => {
        setAlerts(prev => prev.map(a =>
            a.id === alertId ? { ...a, acknowledged: true } : a
        ));
    };

    const clearAlerts = () => {
        setAlerts([]);
    };

    return {
        sessions,
        filteredSessions,
        selectedSession,
        alerts,
        loading,
        error,
        connected,
        filters,
        setFilters,
        selectSession: setSelectedSessionId,
        refreshSessions,
        startSession,
        pauseSession,
        resumeSession,
        stopSession,
        updateTPSL,
        bulkOperation,
        acknowledgeAlert,
        clearAlerts
    };
}
