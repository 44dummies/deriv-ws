import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    Play, Square, Pause, AlertTriangle, Activity, Users, DollarSign,
    BarChart3, Settings, Bell, RefreshCw, ChevronRight, Plus, Eye,
    TrendingUp, TrendingDown, Server, Shield, Zap, Globe
} from 'lucide-react';
import apiClient from '../../services/apiClient';

// Premium Card Component with Glassmorphism
const Card = ({ children, className = '' }) => (
    <div className={`rounded-2xl border backdrop-blur-xl transition-all duration-300
    bg-white/5 border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10 ${className}`}>
        {children}
    </div>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [botStatus, setBotStatus] = useState(null);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshing, setRefreshing] = useState(false);

    const loadDashboard = useCallback(async () => {
        try {
            const [sessionsRes, botRes, statsRes] = await Promise.all([
                apiClient.get('/admin/sessions?limit=10'),
                apiClient.get('/admin/bot/status'),
                apiClient.get('/admin/stats')
            ]);

            setSessions(sessionsRes?.sessions || []);
            setBotStatus(botRes || {});
            setStats(statsRes || {});
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            if (error.status === 403) {
                toast.error('Admin access required');
                navigate('/user/dashboard');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadDashboard();
        const interval = setInterval(loadDashboard, 30000);
        return () => clearInterval(interval);
    }, [loadDashboard]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
        toast.success('Dashboard refreshed');
    };

    const handleBotStart = async () => {
        const activeSession = sessions.find(s => s.status === 'running' || s.status === 'pending');
        if (!activeSession) {
            toast.error('No active session to start bot');
            return;
        }
        try {
            await apiClient.post('/admin/bot/start', { sessionId: activeSession.id });
            toast.success('Bot started');
            loadDashboard();
        } catch (error) {
            toast.error(error.message || 'Failed to start bot');
        }
    };

    const handleBotStop = async () => {
        try {
            await apiClient.post('/admin/bot/stop');
            toast.success('Bot stopped');
            loadDashboard();
        } catch (error) {
            toast.error(error.message || 'Failed to stop bot');
        }
    };

    const handleEmergencyStop = async () => {
        if (!window.confirm('EMERGENCY STOP: This will immediately halt all trading. Continue?')) {
            return;
        }
        try {
            await apiClient.post('/admin/bot/override', { reason: 'Manual emergency stop' });
            toast.success('Emergency stop executed');
            loadDashboard();
        } catch (error) {
            toast.error(error.message || 'Failed to execute emergency stop');
        }
    };

    const formatUptime = (ms) => {
        if (!ms) return '0s';
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-blue-500/30">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent pointer-events-none"></div>

            <Toaster position="top-right" toastOptions={{
                style: { background: '#1a1a20', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            }} />

            <div className="relative z-10">
                {/* Header */}
                <header className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50 bg-[#0a0a0f]/80">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-white bg-clip-text text-transparent">
                                    Admin Command
                                </h1>
                                <p className="text-xs text-gray-500 tracking-wider font-medium">SYSTEM OVERVIEW</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={handleRefresh} className={`p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition ${refreshing ? 'animate-spin' : ''}`}>
                                <RefreshCw className="w-5 h-5 text-gray-400" />
                            </button>
                            <button onClick={() => navigate('/admin/notifications')} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition">
                                <Bell className="w-5 h-5 text-gray-400" />
                            </button>
                            <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                                <span className={`w-2 h-2 rounded-full ${botStatus?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                <span className="text-sm font-medium text-gray-300">{botStatus?.isRunning ? 'System Active' : 'System Idle'}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto p-6 space-y-8">

                    {/* Bot Control Center */}
                    <Card className="p-1 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl ${botStatus?.isRunning ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30' : 'bg-gradient-to-br from-gray-700 to-gray-800'}`}>
                                    <Server className="w-10 h-10 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Trading Engine</h2>
                                    <div className="flex gap-4 text-sm text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>Uptime: {formatUptime(botStatus?.uptime)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4" />
                                            <span>{botStatus?.tradesExecuted || 0} Executions</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {!botStatus?.isRunning ? (
                                    <button onClick={handleBotStart} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95">
                                        <Play className="w-5 h-5 fill-current" />
                                        Launch System
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleBotStop} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-all hover:scale-105">
                                            <Square className="w-5 h-5 fill-current" />
                                            Stop
                                        </button>
                                        <button onClick={handleEmergencyStop} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold shadow-lg shadow-red-500/20 transition-all hover:scale-105">
                                            <AlertTriangle className="w-5 h-5" />
                                            Kill Switch
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={<Activity />} label="Total Volume" value={stats?.totalTrades || 0} trend="+12%" color="blue" />
                        <StatCard icon={<TrendingUp />} label="Win Rate" value={`${(stats?.winRate || 0).toFixed(1)}%`} trend="+2.4%" color="green" />
                        <StatCard icon={<DollarSign />} label="Net Profit" value={`$${(stats?.totalProfit || 0).toFixed(2)}`} trend={stats?.totalProfit >= 0 ? "up" : "down"} color={stats?.totalProfit >= 0 ? "green" : "red"} />
                        <StatCard icon={<Users />} label="Active Agents" value={stats?.activeUsers || 0} color="purple" />
                    </div>

                    {/* Navbar */}
                    <div className="flex gap-2 p-1.5 rounded-xl bg-white/5 border border-white/5 w-fit">
                        {['overview', 'sessions', 'analytics', 'logs'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === tab
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="min-h-[400px]">
                        {activeTab === 'overview' && (
                            <div className="grid lg:grid-cols-3 gap-6">
                                {/* Recent Sessions */}
                                <Card className="lg:col-span-2 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Globe className="w-5 h-5 text-blue-400" />
                                            Active Sessions
                                        </h3>
                                        <button onClick={() => navigate('/admin/sessions')} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition">View All</button>
                                    </div>

                                    <div className="space-y-4">
                                        {sessions.slice(0, 4).map(session => (
                                            <div key={session.id} className="group flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all cursor-pointer" onClick={() => navigate(`/admin/sessions/${session.id}`)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-2 h-12 rounded-full ${session.status === 'running' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                                                    <div>
                                                        <h4 className="font-semibold text-white group-hover:text-blue-400 transition">{session.name}</h4>
                                                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{session.type} • {session.trade_count || 0} TRADES</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`block font-mono font-bold ${(session.current_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        ${(session.current_pnl || 0).toFixed(2)}
                                                    </span>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${session.status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {session.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        <button onClick={() => navigate('/admin/sessions/new')} className="w-full py-4 rounded-xl border border-dashed border-white/10 text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition flex items-center justify-center gap-2">
                                            <Plus className="w-5 h-5" />
                                            Create New Session
                                        </button>
                                    </div>
                                </Card>

                                {/* Analytics Preview */}
                                <Card className="p-6">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-purple-400" />
                                        Performance
                                    </h3>
                                    <div className="space-y-6">
                                        <InfoRow label="Max Win Streak" value={stats?.maxWinStreak || 0} valueColor="text-green-400" />
                                        <InfoRow label="Max Loss Streak" value={stats?.maxLossStreak || 0} valueColor="text-red-400" />
                                        <InfoRow label="Avg Profit / Trade" value={`$${(stats?.avgProfit || 0).toFixed(2)}`} valueColor="text-blue-400" />
                                        <InfoRow label="Return on Investment" value={`${(stats?.roi || 0).toFixed(2)}%`} valueColor={stats?.roi >= 0 ? "text-green-400" : "text-red-400"} />

                                        <div className="pt-6 border-t border-white/10 mt-6">
                                            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5">
                                                <p className="text-xs text-gray-400 mb-1">PROJECTED DAILY</p>
                                                <p className="text-2xl font-bold text-white">$1,240.50</p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab !== 'overview' && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-6 animate-pulse">
                                    <Activity className="w-12 h-12 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Module Loading...</h3>
                                <p className="text-gray-400 max-w-sm">
                                    Please use the specialized {activeTab} page for full details.
                                </p>
                                <button onClick={() => navigate(`/admin/${activeTab === 'analytics' ? 'stats' : activeTab}`)} className="mt-8 px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition">
                                    Open {activeTab} Module
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, trend, color }) => {
    const gradients = {
        blue: 'from-blue-600 to-indigo-600',
        green: 'from-emerald-500 to-teal-600',
        red: 'from-red-600 to-rose-600',
        purple: 'from-violet-600 to-purple-600',
    };

    return (
        <Card className="p-5 group hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${gradients[color] || 'from-gray-700 to-gray-600'} shadow-lg shadow-${color}-500/20`}>
                    {React.cloneElement(icon, { className: "w-6 h-6 text-white" })}
                </div>
                {trend && (
                    <div className={`px-2 py-1 rounded-lg text-xs font-bold ${trend.includes('+') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
                <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
            </div>
        </Card>
    );
};

const InfoRow = ({ label, value, valueColor = "text-white" }) => (
    <div className="flex justify-between items-center group">
        <span className="text-gray-400 group-hover:text-gray-300 transition">{label}</span>
        <span className={`font-mono font-bold ${valueColor}`}>{value}</span>
    </div>
);

export default AdminDashboard;
