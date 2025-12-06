import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    Play, Square, Pause, AlertTriangle, Activity, Users, DollarSign,
    BarChart3, Settings, Bell, Clock, TrendingUp, TrendingDown,
    RefreshCw, Menu, ChevronRight, Plus, Trash2, Edit, Eye
} from 'lucide-react';
import apiClient from '../../services/apiClient';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [botStatus, setBotStatus] = useState(null);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshing, setRefreshing] = useState(false);

    // Load dashboard data
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
        const seconds = Math.floor((ms % 60000) / 1000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            <Toaster position="top-right" />

            {/* Header */}
            <header className="border-b border-white/10 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${botStatus?.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                            {botStatus?.isRunning ? 'Bot Running' : 'Bot Stopped'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                            disabled={refreshing}
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => navigate('/admin/notifications')}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            <Bell className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate('/admin/settings')}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="p-6">
                {/* Bot Controls */}
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold mb-1">Bot Control</h2>
                            <p className="text-sm text-gray-400">
                                {botStatus?.isRunning
                                    ? `Running for ${formatUptime(botStatus.uptime)} • ${botStatus.tradesExecuted || 0} trades`
                                    : 'Bot is stopped'
                                }
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {!botStatus?.isRunning ? (
                                <button
                                    onClick={handleBotStart}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                                >
                                    <Play className="w-4 h-4" />
                                    Start Bot
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleBotStop}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition"
                                    >
                                        <Square className="w-4 h-4" />
                                        Stop
                                    </button>
                                    <button
                                        onClick={handleEmergencyStop}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                        Emergency
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        icon={<Activity className="w-5 h-5" />}
                        label="Total Trades"
                        value={stats?.totalTrades || 0}
                        color="blue"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5" />}
                        label="Win Rate"
                        value={`${(stats?.winRate || 0).toFixed(1)}%`}
                        color="green"
                    />
                    <StatCard
                        icon={<DollarSign className="w-5 h-5" />}
                        label="Total Profit"
                        value={`$${(stats?.totalProfit || 0).toFixed(2)}`}
                        color={stats?.totalProfit >= 0 ? 'green' : 'red'}
                    />
                    <StatCard
                        icon={<Users className="w-5 h-5" />}
                        label="Active Users"
                        value={stats?.activeUsers || 0}
                        color="purple"
                    />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {['overview', 'sessions', 'analytics', 'logs'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === tab
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Recent Sessions */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Recent Sessions</h3>
                                <button
                                    onClick={() => navigate('/admin/sessions')}
                                    className="text-sm text-blue-400 hover:text-blue-300"
                                >
                                    View All
                                </button>
                            </div>

                            <div className="space-y-3">
                                {sessions.slice(0, 5).map(session => (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{session.name}</p>
                                            <p className="text-xs text-gray-400">
                                                {session.type} • {session.trade_count || 0} trades
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs ${session.status === 'running' ? 'bg-green-500/20 text-green-400' :
                                                session.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {session.status}
                                        </span>
                                    </div>
                                ))}

                                {sessions.length === 0 && (
                                    <p className="text-center text-gray-400 py-4">No sessions yet</p>
                                )}
                            </div>

                            <button
                                onClick={() => navigate('/admin/sessions/new')}
                                className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                            >
                                <Plus className="w-4 h-4" />
                                Create Session
                            </button>
                        </div>

                        {/* Quick Stats */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <h3 className="font-semibold mb-4">Performance</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Win Streak (Max)</span>
                                    <span className="font-medium text-green-400">{stats?.maxWinStreak || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Loss Streak (Max)</span>
                                    <span className="font-medium text-red-400">{stats?.maxLossStreak || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Average Profit</span>
                                    <span className={`font-medium ${stats?.avgProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${(stats?.avgProfit || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">ROI</span>
                                    <span className={`font-medium ${stats?.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {(stats?.roi || 0).toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Sessions</span>
                                    <span className="font-medium">{stats?.sessionCount || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sessions' && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">All Sessions</h3>
                            <button
                                onClick={() => navigate('/admin/sessions/new')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                New Session
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b border-white/10">
                                        <th className="pb-3 font-medium">Name</th>
                                        <th className="pb-3 font-medium">Type</th>
                                        <th className="pb-3 font-medium">Status</th>
                                        <th className="pb-3 font-medium">Trades</th>
                                        <th className="pb-3 font-medium">P&L</th>
                                        <th className="pb-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map(session => (
                                        <tr key={session.id} className="border-b border-white/5">
                                            <td className="py-3">{session.name}</td>
                                            <td className="py-3 capitalize">{session.type}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs ${session.status === 'running' ? 'bg-green-500/20 text-green-400' :
                                                        session.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                                            session.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {session.status}
                                                </span>
                                            </td>
                                            <td className="py-3">{session.trade_count || 0}</td>
                                            <td className={`py-3 ${(session.current_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ${(session.current_pnl || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/sessions/${session.id}`)}
                                                        className="p-1 rounded hover:bg-white/10"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="text-center py-12 text-gray-400">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Analytics dashboard coming soon</p>
                        <button
                            onClick={() => navigate('/admin/stats')}
                            className="mt-4 text-blue-400 hover:text-blue-300"
                        >
                            View Detailed Stats
                        </button>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="text-center py-12 text-gray-400">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Logs viewer coming soon</p>
                        <button
                            onClick={() => navigate('/admin/logs')}
                            className="mt-4 text-blue-400 hover:text-blue-300"
                        >
                            View All Logs
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => {
    const colorClasses = {
        blue: 'from-blue-500/20 to-blue-600/20 text-blue-400',
        green: 'from-green-500/20 to-green-600/20 text-green-400',
        red: 'from-red-500/20 to-red-600/20 text-red-400',
        purple: 'from-purple-500/20 to-purple-600/20 text-purple-400',
        yellow: 'from-yellow-500/20 to-yellow-600/20 text-yellow-400'
    };

    return (
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} border border-white/10`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-sm text-gray-300">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
};

export default AdminDashboard;
