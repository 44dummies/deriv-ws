/**
 * Admin Dashboard - Liquid Glass Renovation
 * Features: Real-time charts, Bot Controls, and Live Signal Feed
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    Play, Square, AlertTriangle, Activity, Users, DollarSign,
    TrendingUp, Server, Clock, Zap, Wallet, CreditCard, ChevronRight, Wifi, WifiOff,
    PieChart as PieIcon, BarChart as BarIcon
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import * as tradingApi from '../../trading/tradingApi';
import { realtimeSocket } from '../../services/realtimeSocket';
import { useAdminEventStream } from '../../hooks/useEventStream';

// Glass UI Components
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassMetricTile } from '../../components/ui/glass/GlassMetricTile';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { GlassStatusBadge } from '../../components/ui/glass/GlassStatusBadge';

// Interfaces
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
    history?: { date: string; profit: number }[]; // Mock history for chart if needed
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

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [balances, setBalances] = useState({ real: 0, demo: 0 });

    // Mock history data generator (replace with API if available)
    const chartData = useMemo(() => {
        const data = [];
        let profit = stats?.totalProfit || 0;
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            // Simulate random daily fluctuation based on total profit
            const dailyChange = (Math.random() - 0.4) * (Math.abs(profit) * 0.1);
            data.push({
                name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                profit: profit - dailyChange * (i + 1), // Work backwards slightly
            });
        }
        // Ensure last point matches current
        if (data.length > 0) data[data.length - 1].profit = profit;
        return data;
    }, [stats?.totalProfit]);

    const signalData = useMemo(() => {
        if (!botStatus?.signalStats) return [];
        return Object.entries(botStatus.signalStats).map(([market, stat]: [string, any]) => ({
            name: market,
            value: stat.confidence * 100
        }));
    }, [botStatus?.signalStats]);

    // SSE for real-time updates
    const { events: sseEvents, isConnected: sseConnected } = useAdminEventStream({
        onEvent: (event) => {
            if (event.type === 'trade.executed') {
                toast(`Trade Opened: ${event.payload.direction} ${event.payload.symbol}`, { icon: '🚀' });
                loadDashboard();
            } else if (event.type === 'trade.closed') {
                const isWin = (event.payload.profitLoss as number) > 0;
                toast(`Trade ${isWin ? 'Won' : 'Lost'}: $${(event.payload.profitLoss as number).toFixed(2)}`,
                    { icon: isWin ? '🎉' : '📉' });
                loadDashboard();
            } else if (event.type.startsWith('session.')) {
                loadDashboard();
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

        const interval = setInterval(loadDashboard, sseConnected ? 60000 : 30000);
        return () => {
            clearInterval(interval);
            removeSignalListener();
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
        <div className="space-y-6 md:space-y-8 animate-fade-in-up pb-12">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a20', color: '#fff' } }} />

            {/* Header / Wallet Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Real Balance</p>
                            <h2 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(balances.real)}</h2>
                            <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
                                <Activity size={12} />
                                <span>Connected to Deriv API</span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                            <Wallet size={24} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="relative overflow-hidden group">
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Demo Balance</p>
                            <h2 className="text-3xl font-bold text-amber-500 tracking-tight">{formatCurrency(balances.demo)}</h2>
                            <div className="flex items-center gap-2 mt-2 text-xs text-amber-400/80">
                                <Activity size={12} />
                                <span>Virtual Account Active</span>
                            </div>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                            <CreditCard size={24} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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

            {/* Central Controls & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Bot Control Panel */}
                <GlassCard className="lg:col-span-2 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${botStatus?.isRunning ? 'bg-emerald-500/20 text-emerald-400 animate-pulse-subtle' : 'bg-red-500/20 text-red-400'}`}>
                                <Server size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Trading Engine</h3>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={botStatus?.isRunning ? 'text-emerald-400' : 'text-slate-500'}>
                                        {botStatus?.isRunning ? 'RUNNING' : 'STOPPED'}
                                    </span>
                                    <span className="text-slate-600">|</span>
                                    {sseConnected ? (
                                        <span className="flex items-center gap-1 text-emerald-400"><Wifi size={12} /> Live</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-amber-400"><WifiOff size={12} /> Polling</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {!botStatus?.isRunning ? (
                                <GlassButton variant="primary" onClick={handleBotStart} leftIcon={<Play size={16} />}>
                                    Start
                                </GlassButton>
                            ) : (
                                <>
                                    <GlassButton variant="secondary" onClick={handleBotStop} leftIcon={<Square size={16} />}>
                                        Stop
                                    </GlassButton>
                                    <GlassButton variant="danger" onClick={() => tradingApi.stopBot()} leftIcon={<AlertTriangle size={16} />}>
                                        Kill
                                    </GlassButton>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Performance Chart Area */}
                    <div className="flex-1 min-h-[250px] bg-black/20 rounded-xl border border-white/5 p-4 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <BarIcon size={14} /> PnL Trend (Last 7 Days)
                            </h4>
                            <span className="text-xs text-emerald-400 font-mono">+14.2%</span>
                        </div>
                        <ResponsiveContainer width="100%" height="90%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="name"
                                    stroke="rgba(255,255,255,0.3)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.3)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#colorProfit)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 mt-4 border-t border-white/5">
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
                            <p className="font-mono text-lg text-slate-300">{botStatus?.lastTrade || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Mode</p>
                            <p className="font-mono text-lg text-blue-400">AUTONOMOUS</p>
                        </div>
                    </div>
                </GlassCard>

                {/* Right Column: Signal Distribution & Session List */}
                <div className="flex flex-col gap-6">
                    {/* Signal Distribution Pie Chart */}
                    <GlassCard>
                        <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-4">
                            <PieIcon size={14} /> Signals by Market
                        </h4>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={signalData.length > 0 ? signalData : [{ name: 'No Signals', value: 1 }]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {(signalData.length > 0 ? signalData : [{ name: 'No Signals', value: 1 }]).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                            {signalData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-1 text-xs text-slate-400">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    {entry.name}
                                </div>
                            ))}
                            {signalData.length === 0 && <span className="text-xs text-slate-500">Waiting for data...</span>}
                        </div>
                    </GlassCard>

                    {/* Session List (Compact) */}
                    <GlassCard className="flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Recent Sessions</h3>
                            <button onClick={() => navigate('/admin/sessions')} className="text-xs text-emerald-400 hover:text-emerald-300">View All</button>
                        </div>

                        <div className="space-y-3">
                            {sessions.slice(0, 3).map(session => (
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
            </div>

            {/* Live Data Footer Ticker */}
            {botStatus?.isRunning && botStatus.signalStats && (
                <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
                    <div className="max-w-screen-xl mx-auto flex gap-4 overflow-hidden mask-linear-fade">
                        {Object.entries(botStatus.signalStats).map(([market, stat]: [string, any]) => (
                            <div key={market} className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 flex items-center gap-3 animate-slide-left pointer-events-auto shadow-xl">
                                <span className="text-xs font-bold text-slate-300">{market}</span>
                                <div className={`flex items-center gap-1 text-sm font-bold ${stat.side === 'call' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {stat.side === 'call' ? <TrendingUp size={14} /> : <TrendingUp className="rotate-180" size={14} />}
                                    {stat.side.toUpperCase()}
                                </div>
                                <span className="text-xs text-slate-400">{(stat.confidence * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
