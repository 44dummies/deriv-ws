/**
 * Admin Dashboard - Main Overview
 * Modern dashboard with bot control, stats, and session overview
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    Play, Square, AlertTriangle, Activity, Users, DollarSign,
    TrendingUp, Server, Clock, Zap, Plus, ArrowUpRight, BarChart2,
    CreditCard, Wallet
} from 'lucide-react';
import * as tradingApi from '../../trading/tradingApi';

interface BotStatus {
    isRunning: boolean;
    uptime?: number;
    tradesExecuted?: number;
    lastTrade?: string;
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

    const loadDashboard = useCallback(async () => {
        try {
            const [sessionsRes, botRes, statsRes, balancesRes] = await Promise.all([
                tradingApi.getSessions({ limit: 5 }),
                tradingApi.getBotStatus(),
                tradingApi.getStats(),
                tradingApi.getBalances()
            ]);

            setSessions(sessionsRes?.data || sessionsRes?.sessions || []);
            setBotStatus(botRes || { isRunning: false });
            setStats(statsRes || {});

            if (balancesRes?.success && balancesRes?.data) {
                setBalances({
                    real: balancesRes.data.real || 0,
                    demo: balancesRes.data.demo || 0
                });
            }
        } catch (error: any) {
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

    const handleBotStart = async () => {
        const activeSession = sessions.find(s => s.status === 'running' || s.status === 'pending');
        if (!activeSession) {
            toast.error('No active session to start bot');
            return;
        }
        try {
            await tradingApi.startBot(activeSession.id);
            toast.success('Trading engine started!');
            loadDashboard();
        } catch (error: any) {
            toast.error(error.message || 'Failed to start bot');
        }
    };

    const handleBotStop = async () => {
        try {
            await tradingApi.stopBot();
            toast.success('Trading engine stopped');
            loadDashboard();
        } catch (error: any) {
            toast.error(error.message || 'Failed to stop bot');
        }
    };

    const handleEmergencyStop = async () => {
        if (!window.confirm('EMERGENCY STOP: This will immediately halt all trading. Continue?')) {
            return;
        }
        try {
            await tradingApi.stopBot();
            toast.success('Emergency stop executed!');
            loadDashboard();
        } catch (error: any) {
            toast.error(error.message || 'Failed to execute emergency stop');
        }
    };

    const formatUptime = (ms?: number): string => {
        if (!ms) return '0m';
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const formatCurrency = (value?: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1a1a20',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            />

            {/* Wallet Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="admin-card card-responsive flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Real Balance</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(balances.real)}</h3>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-blue-500" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>

                <div className="admin-card card-responsive flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Demo Balance</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-amber-500">{formatCurrency(balances.demo)}</h3>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-amber-500" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                </div>
            </div>

            {/* Bot Control Panel */}
            <div className="admin-card bot-control">
                <div className="bot-header">
                    <div className="bot-info">
                        <div className={`bot-icon ${botStatus?.isRunning ? 'running' : 'stopped'}`}>
                            <Server />
                        </div>
                        <div className="bot-details">
                            <h2>Trading Engine</h2>
                            <div className="bot-stats">
                                <div className="bot-stat">
                                    <Clock />
                                    <span>Uptime: {formatUptime(botStatus?.uptime)}</span>
                                </div>
                                <div className="bot-stat">
                                    <Zap />
                                    <span>{botStatus?.tradesExecuted || 0} Executions</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bot-actions">
                        {!botStatus?.isRunning ? (
                            <button className="btn btn-success" onClick={handleBotStart}>
                                <Play size={20} />
                                Launch System
                            </button>
                        ) : (
                            <>
                                <button className="btn btn-secondary" onClick={handleBotStop}>
                                    <Square size={20} />
                                    Stop
                                </button>
                                <button className="btn btn-danger" onClick={handleEmergencyStop}>
                                    <AlertTriangle size={20} />
                                    Kill Switch
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    icon={<Activity />}
                    label="Total Trades"
                    value={String(stats?.totalTrades || 0)}
                    trend="+12%"
                    color="blue"
                />
                <StatCard
                    icon={<TrendingUp />}
                    label="Win Rate"
                    value={`${(stats?.winRate || 0).toFixed(1)}%`}
                    trend="+2.4%"
                    color="green"
                />
                <StatCard
                    icon={<DollarSign />}
                    label="Net Profit"
                    value={formatCurrency(stats?.totalProfit)}
                    trend={(stats?.totalProfit || 0) >= 0 ? '+' : ''}
                    color={(stats?.totalProfit || 0) >= 0 ? 'green' : 'red'}
                />
                <StatCard
                    icon={<Users />}
                    label="Active Users"
                    value={String(stats?.activeUsers || 0)}
                    color="purple"
                />
            </div>

            {/* Trading System Performance */}
            <div className="admin-card card-responsive mb-6" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-emerald-400">
                        <TrendingUp size={18} />
                        Trading System Performance
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs ${botStatus?.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {botStatus?.isRunning ? '● Live' : '○ Stopped'}
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Active Participants</p>
                        <p className="text-xl font-bold text-white">{stats?.activeUsers || 0}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Win Rate</p>
                        <p className="text-xl font-bold text-emerald-400">{(stats?.winRate || 0).toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Total P&L</p>
                        <p className={`text-xl font-bold ${(stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(stats?.totalProfit)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Est. Daily Earning</p>
                        <p className="text-xl font-bold text-amber-400">
                            {formatCurrency(((stats?.totalProfit || 0) / Math.max(1, stats?.totalTrades || 1)) * ((stats?.winRate || 50) / 100) * 100)}
                        </p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-xs text-gray-500">
                        💡 Projected based on current win rate of {(stats?.winRate || 0).toFixed(1)}% across {stats?.totalTrades || 0} trades.
                        With {stats?.activeUsers || 0} active participants, the system executes trades automatically based on signal analysis.
                    </p>
                </div>
            </div>

            {/* Sessions & Quick Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Recent Sessions */}
                <div className="admin-card card-responsive lg:col-span-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 sm:mb-5">
                        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                            <BarChart2 size={18} className="text-blue-500" />
                            Recent Sessions
                        </h3>
                        <button
                            onClick={() => navigate('/admin/sessions')}
                            className="text-blue-500 text-sm font-medium bg-transparent border-none cursor-pointer flex items-center gap-1 hover:text-blue-400 transition-colors"
                        >
                            View All <ArrowUpRight size={14} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 sm:gap-3">
                        {sessions.length === 0 ? (
                            <div className="text-center py-8 sm:py-10 text-gray-400">
                                <Activity size={36} className="mx-auto mb-4 opacity-30" />
                                <p className="text-sm">No sessions yet</p>
                            </div>
                        ) : (
                            sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => navigate(`/admin/sessions/${session.id}`)}
                                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] hover:border-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1 h-8 sm:h-10 rounded-sm ${session.status === 'running' ? 'bg-green-500' : 'bg-gray-600'}`} />
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-sm sm:text-base truncate">{session.name}</h4>
                                            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">
                                                {session.type || 'Standard'} • {session.trade_count || 0} trades
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <span className={`font-mono font-bold text-sm sm:text-base ${(session.current_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {formatCurrency(session.current_pnl)}
                                        </span>
                                        <span className={`badge block mt-1 text-[10px] ${session.status === 'running' ? 'badge-success' : 'badge-neutral'}`}>
                                            {session.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}

                        <button
                            onClick={() => navigate('/admin/sessions/new')}
                            className="flex items-center justify-center gap-2 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-dashed border-white/10 bg-transparent text-gray-400 cursor-pointer hover:border-white/20 hover:text-white hover:bg-white/[0.03] transition-all text-sm"
                        >
                            <Plus size={18} />
                            Create New Session
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="admin-card card-responsive">
                    <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-5 flex items-center gap-2">
                        <Zap size={18} className="text-purple-500" />
                        Quick Actions
                    </h3>

                    <div className="flex flex-col gap-2 sm:gap-3">
                        <QuickAction
                            label="Create Session"
                            description="Start a new trading session"
                            onClick={() => navigate('/admin/sessions/new')}
                        />
                        <QuickAction
                            label="View Users"
                            description="Manage user accounts"
                            onClick={() => navigate('/admin/users')}
                        />
                        <QuickAction
                            label="Activity Logs"
                            description="View system activity"
                            onClick={() => navigate('/admin/logs')}
                        />
                        <QuickAction
                            label="Settings"
                            description="Configure system settings"
                            onClick={() => navigate('/admin/settings')}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

// Stat Card Component
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend?: string;
    color: 'blue' | 'green' | 'red' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, color }) => {
    const colors = {
        blue: { main: '#3b82f6', alt: '#8b5cf6' },
        green: { main: '#10b981', alt: '#059669' },
        red: { main: '#ef4444', alt: '#dc2626' },
        purple: { main: '#8b5cf6', alt: '#7c3aed' }
    };

    return (
        <div
            className="admin-card stat-card"
            style={{ '--stat-color': colors[color].main, '--stat-color-alt': colors[color].alt } as React.CSSProperties}
        >
            <div className="stat-header">
                <div className="stat-icon">
                    {icon}
                </div>
                {trend && (
                    <span className={`stat-trend ${trend.includes('+') || !trend.includes('-') ? 'up' : 'down'}`}>
                        {trend}
                    </span>
                )}
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
};

// Quick Action Component
interface QuickActionProps {
    label: string;
    description: string;
    onClick: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, description, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-start p-3 sm:p-4 rounded-lg sm:rounded-xl border border-white/5 bg-white/[0.03] cursor-pointer transition-all text-left hover:bg-blue-500/10 hover:border-blue-500/30"
    >
        <span className="text-white font-semibold text-sm">{label}</span>
        <span className="text-gray-400 text-xs mt-1">{description}</span>
    </button>
);

export default AdminDashboard;
