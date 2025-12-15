/**
 * Admin Dashboard - Liquid Glass Renovation
 * No charts, pure numeric/status visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    Play, Square, AlertTriangle, Activity, Users, DollarSign,
    TrendingUp, Server, Clock, Zap, Wallet, CreditCard, ChevronRight, Wifi, WifiOff
} from 'lucide-react';
import * as tradingApi from '../../trading/tradingApi';
import { realtimeSocket } from '../../services/realtimeSocket';
import { useAdminEventStream } from '../../hooks/useEventStream';

// Glass UI Components
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassMetricTile } from '../../components/ui/glass/GlassMetricTile';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { GlassStatusBadge } from '../../components/ui/glass/GlassStatusBadge';

// Interfaces remain the same for data compatibility
interface BotStatus {
    isRunning: boolean;
    uptime?: number;
    tradesExecuted?: number;
    lastTrade?: string;
    signalStats?: Record<string, any>;
}

interface Stats {
    totalTrades?: number;
    winRate?: number;
    totalProfit?: number;
    activeUsers?: number;
}

interface Session {
    id: string;
    name: string;
    status: string;
    type?: string;
    trade_count?: number;
    current_pnl?: number;
    created_at?: string;
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [balances, setBalances] = useState({ real: 0, demo: 0 });

    // SSE for real-time updates (replaces polling)
    const { events: sseEvents, isConnected: sseConnected } = useAdminEventStream({
        onEvent: (event) => {
            // Handle real-time trade events
            if (event.type === 'trade.executed') {
                toast(`Trade Opened: ${event.payload.direction} ${event.payload.symbol}`, { icon: '🚀' });
                loadDashboard(); // Refresh data
            } else if (event.type === 'trade.closed') {
                const isWin = (event.payload.profitLoss as number) > 0;
                toast(`Trade ${isWin ? 'Won' : 'Lost'}: $${(event.payload.profitLoss as number).toFixed(2)}`,
                    { icon: isWin ? '🎉' : '📉' });
                loadDashboard();
            } else if (event.type.startsWith('session.')) {
                loadDashboard(); // Refresh on session events
            }
        }
    });

    const loadDashboard = useCallback(async () => {
        try {
            const userInfoStr = sessionStorage.getItem('userInfo');
            if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                setBalances({
                    real: userInfo.real_balance || userInfo.balance || 0,
                    demo: userInfo.demo_balance || 0
                });
            }

            const [sessionsRes, botRes, statsRes] = await Promise.all([
                tradingApi.getSessions({ limit: 5 }),
                tradingApi.getBotStatus(),
                tradingApi.getStats()
            ]);

            setSessions(sessionsRes?.data || sessionsRes?.sessions || []);
            setBotStatus(botRes || { isRunning: false });
            setStats(statsRes || {});

        } catch (error: any) {
            console.error('Failed to load dashboard:', error);
            if (error.status === 403) {
                toast.error('Admin access required');
                navigate('/user/dashboard');
            } else if (error.status === 401 || error.message === 'Session expired') {
                // Stop polling by unmounting (navigation)
                navigate('/auth/login');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadDashboard();
        const token = sessionStorage.getItem('accessToken');
        if (token && !realtimeSocket.isConnected()) {
            realtimeSocket.connect(token);
        }
        realtimeSocket.emit('subscribe_market', 'R_100');

        const removeSignalListener = realtimeSocket.on('signal_update', (data) => {
            if (botStatus?.isRunning) {
                setBotStatus(prev => {
                    if (!prev) return prev;
                    return { ...prev, signalStats: { ...prev.signalStats, [data.market]: data } };
                });
            }
        });

        const removeTradeListener = realtimeSocket.on('trade_update', (data) => {
            if (data.type === 'open') {
                // SSE handles this now, but keep as fallback
                if (!sseConnected) {
                    toast(`Trade Opened: ${data.signal} ${data.market}`, { icon: '🚀' });
                    loadDashboard();
                }
            }
        });

        // Reduce polling interval since SSE provides real-time updates
        const interval = setInterval(loadDashboard, sseConnected ? 60000 : 30000);
        return () => {
            clearInterval(interval);
            removeSignalListener();
            removeTradeListener();
        };
    }, [loadDashboard, botStatus?.isRunning, sseConnected]);

    const handleBotStart = async () => {
        const activeSession = sessions.find(s => s.status === 'running' || s.status === 'pending');
        if (!activeSession) {
            toast.error('No active session to start bot');
            return;
        }
        try {
            await tradingApi.startBot(activeSession.id);
            toast.success('Bot Started');
            loadDashboard();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleBotStop = async () => {
        try {
            await tradingApi.stopBot();
            toast.success('Bot Stopped');
            loadDashboard();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const formatCurrency = (val?: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

    return (
        <div className="space-y-8">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a20', color: '#fff' } }} />

            {/* Header / Wallet Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Real Balance</p>
                            <h2 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(balances.real)}</h2>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                            <Wallet size={24} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Demo Balance</p>
                            <h2 className="text-3xl font-bold text-amber-500 tracking-tight">{formatCurrency(balances.demo)}</h2>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                            <CreditCard size={24} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <GlassMetricTile
                    label="Total Trades"
                    value={stats?.totalTrades || 0}
                    icon={<Activity size={18} />}
                    trend="up"
                    trendValue="12% vs last week"
                />
                <GlassMetricTile
                    label="Win Rate"
                    value={`${(stats?.winRate || 0).toFixed(1)}%`}
                    icon={<TrendingUp size={18} />}
                    trend="up"
                    trendValue="Stable"
                />
                <GlassMetricTile
                    label="Net Profit"
                    value={formatCurrency(stats?.totalProfit)}
                    icon={<DollarSign size={18} />}
                    trend={(stats?.totalProfit || 0) >= 0 ? 'up' : 'down'}
                />
                <GlassMetricTile
                    label="Active Users"
                    value={stats?.activeUsers || 0}
                    icon={<Users size={18} />}
                />
            </div>

            {/* Control Center & Live Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bot Control Panel */}
                <GlassCard className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${botStatus?.isRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                <Server size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Trading Engine</h3>
                                <p className="text-xs text-slate-400 flex items-center gap-2">
                                    Status: <span className={botStatus?.isRunning ? 'text-emerald-400' : 'text-slate-500'}>
                                        {botStatus?.isRunning ? 'RUNNING' : 'STOPPED'}
                                    </span>
                                    {sseConnected ? (
                                        <span className="flex items-center gap-1 text-emerald-400"><Wifi size={12} /> Live</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-amber-400"><WifiOff size={12} /> Polling</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {!botStatus?.isRunning ? (
                                <GlassButton variant="primary" onClick={handleBotStart} icon={<Play size={16} />}>
                                    Start System
                                </GlassButton>
                            ) : (
                                <>
                                    <GlassButton variant="secondary" onClick={handleBotStop} icon={<Square size={16} />}>
                                        Stop
                                    </GlassButton>
                                    <GlassButton variant="danger" onClick={() => tradingApi.stopBot()} icon={<AlertTriangle size={16} />}>
                                        Kill
                                    </GlassButton>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Uptime</p>
                            <p className="font-mono text-lg">{botStatus?.uptime ? `${Math.floor(botStatus.uptime / 60000)}m` : '0m'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Executions</p>
                            <p className="font-mono text-lg">{botStatus?.tradesExecuted || 0}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Last Signal</p>
                            <p className="font-mono text-lg text-slate-300">R_100</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Mode</p>
                            <p className="font-mono text-lg text-blue-400">AUTONOMOUS</p>
                        </div>
                    </div>
                </GlassCard>

                {/* Session List (Compact) */}
                <GlassCard>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white">Recent Sessions</h3>
                        <button onClick={() => navigate('/admin/sessions')} className="text-xs text-emerald-400 hover:text-emerald-300">View All</button>
                    </div>

                    <div className="space-y-3">
                        {sessions.slice(0, 4).map(session => (
                            <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => navigate(`/admin/sessions/${session.id}`)}>
                                <div>
                                    <p className="text-sm font-medium text-white truncate max-w-[120px]">{session.name}</p>
                                    <p className="text-xs text-slate-500">{session.type || 'Standard'}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-bold ${(session.current_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatCurrency(session.current_pnl)}
                                    </p>
                                    <GlassStatusBadge status={session.status === 'running' ? 'active' : 'inactive'}>
                                        {session.status}
                                    </GlassStatusBadge>
                                </div>
                            </div>
                        ))}
                        {sessions.length === 0 && <p className="text-slate-500 text-center py-4">No active sessions</p>}
                    </div>

                    <button onClick={() => navigate('/admin/sessions/new')} className="w-full mt-4 py-2 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 transition-all text-sm">
                        + Create New Session
                    </button>
                </GlassCard>
            </div>

            {/* Signal Feed (Text/Tile Only - NO CHARTS) */}
            {botStatus?.isRunning && botStatus.signalStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(botStatus.signalStats).map(([market, stat]: [string, any]) => (
                        <div key={market} className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-slate-300">{market}</span>
                                <span className="text-xs text-slate-500">{new Date(stat.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-xl font-bold ${stat.side === 'call' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {stat.side ? stat.side.toUpperCase() : 'WAITING'}
                                </span>
                                <span className="text-sm text-slate-400">{(stat.confidence * 100).toFixed(0)}% Conf.</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
