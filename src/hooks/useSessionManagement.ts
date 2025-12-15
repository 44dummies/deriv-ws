/**
 * useSessionManagement Hook
 * Manages session data, WebSocket updates, and CRUD operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminEventStream } from './useEventStream';
import {
    ManagedSession,
    SessionFilters,
    SessionAlert,
    TradeInfo,
    SessionAnalytics,
    BulkOperation,
    WSEvent
} from '../types/session';
import { tradingApi } from '../trading/tradingApi';
import { SessionStatusManager } from '../services/SessionStatusManager';
// Removed unused API_URL, using tradingApi instead

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

    // Use Server-Sent Events for real-time updates

    const { isConnected } = useAdminEventStream({
        onConnected: () => {
            setConnected(true);
            setError(null);
            console.log('[SessionManager] SSE Connected');
        },
        onDisconnected: () => {
            setConnected(false);
            console.log('[SessionManager] SSE Disconnected');
        },
        onEvent: (event) => {
            // Handle Session Updates
            if (event.type === 'session.update' || event.type === 'session.started' || event.type === 'session.stopped') {
                const updates = event.payload as Partial<ManagedSession>;
                const sessionId = event.sessionId || (event.payload as any).id;

                if (sessionId) {
                    SessionStatusManager.getInstance().processEvent({
                        type: 'session_update',
                        sessionId: sessionId,
                        data: updates
                    });

                    setSessions(prev => prev.map(s =>
                        s.id === sessionId ? { ...s, ...updates, lastUpdate: new Date().toISOString() } : s
                    ));
                }
            }

            if (event.type === 'trade.executed' || event.type === 'trade.closed') {
                const trade = event.payload as unknown as TradeInfo;
                const action = event.type === 'trade.executed' ? 'open' : 'close';
                const sessionId = event.sessionId;

                if (sessionId && trade) {
                    SessionStatusManager.getInstance().processEvent({
                        type: 'trade_update',
                        sessionId: sessionId,
                        trade: trade,
                        action: action
                    });

                    setSessions(prev => prev.map(s => {
                        if (s.id !== sessionId) return s;

                        let updatedTrades = [...s.trades];
                        let updatedOpenTrades = [...s.openTrades];

                        if (action === 'open') {
                            // Check if trade already exists to avoid duplicates
                            if (!updatedTrades.find(t => t.id === trade.id)) {
                                updatedTrades.push(trade);
                                updatedOpenTrades.push(trade);
                            }
                        } else if (action === 'close') {
                            updatedOpenTrades = updatedOpenTrades.filter(t => t.id !== trade.id);
                            updatedTrades = updatedTrades.map(t => t.id === trade.id ? trade : t);

                            // If trade wasn't in list (e.g. loaded after open), add it
                            if (!updatedTrades.find(t => t.id === trade.id)) {
                                updatedTrades.push(trade);
                            }
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
                    if (action === 'close' && trade.profit !== undefined) {
                        const alert: SessionAlert = {
                            id: `alert-${Date.now()}-${Math.random()}`,
                            sessionId: sessionId,
                            type: trade.profit >= 0 ? 'profit' : 'loss',
                            title: trade.profit >= 0 ? 'Trade Won!' : 'Trade Lost',
                            message: `${trade.type} ${trade.symbol}: ${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}`,
                            timestamp: new Date().toISOString(),
                            acknowledged: false,
                            soundPlayed: false
                        };
                        setAlerts(prev => [alert, ...prev].slice(0, 100));
                    }
                }
            }

            // Handle Notifications/Alerts
            if (event.type === 'notification' || event.type.startsWith('notification.')) {
                const alertData = event.payload as any;
                const alert: SessionAlert = {
                    id: event.id,
                    sessionId: event.sessionId || 'global',
                    type: alertData.type || 'info',
                    title: alertData.title || 'Notification',
                    message: alertData.message || '',
                    timestamp: new Date(event.timestamp).toISOString(),
                    acknowledged: false,
                    soundPlayed: false
                };
                setAlerts(prev => [alert, ...prev].slice(0, 100));
            }
        }
    });

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

                // Register sessions for health monitoring
                managedSessions.forEach(s => {
                    SessionStatusManager.getInstance().registerSession(s.id, s.symbols);
                });
            }
        } catch (err) {
            setError('Failed to load sessions');
            console.error('Error loading sessions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Subscribe to Health Updates
    useEffect(() => {
        const unsubscribe = SessionStatusManager.getInstance().subscribe((healthMap) => {
            setSessions(prev => prev.map(s => {
                const health = healthMap.get(s.id);
                // Only update if health changed to avoid loops, though React state diffing helps
                if (health && s.health !== health) {
                    return { ...s, health };
                }
                return s;
            }));
        });
        return unsubscribe;
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
