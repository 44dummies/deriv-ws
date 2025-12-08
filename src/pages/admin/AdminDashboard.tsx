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
            const [sessionsRes, botRes, statsRes, accountsRes] = await Promise.all([
                tradingApi.getSessions({ limit: 5 }),
                tradingApi.getBotStatus(),
                tradingApi.getStats(),
                tradingApi.getAccounts()
            ]);

            setSessions(sessionsRes?.data || sessionsRes?.sessions || []);
            setBotStatus(botRes || { isRunning: false });
            setStats(statsRes || {});

            if (accountsRes?.data) {
                const real = accountsRes.data.find((a: any) => a.account_type === 'real' || a.account_type === 'standard')?.balance || 0;
                const demo = accountsRes.data.find((a: any) => a.account_type === 'demo')?.balance || 0;
                setBalances({ real, demo });
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div className="admin-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div>
                        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Real Balance</p>
                        <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{formatCurrency(balances.real)}</h3>
                    </div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                        <Wallet size={24} />
                    </div>
                </div>

                <div className="admin-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div>
                        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '4px' }}>Demo Balance</p>
                        <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(balances.demo)}</h3>
                    </div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                        <CreditCard size={24} />
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

            {/* Sessions & Quick Actions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Recent Sessions */}
                <div className="admin-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BarChart2 size={20} style={{ color: '#3b82f6' }} />
                            Recent Sessions
                        </h3>
                        <button
                            onClick={() => navigate('/admin/sessions')}
                            style={{
                                color: '#3b82f6',
                                fontSize: '14px',
                                fontWeight: 500,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            View All <ArrowUpRight size={16} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sessions.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                color: '#9ca3af'
                            }}>
                                <Activity size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                <p>No sessions yet</p>
                            </div>
                        ) : (
                            sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => navigate(`/admin/sessions/${session.id}`)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '4px',
                                            height: '40px',
                                            borderRadius: '2px',
                                            background: session.status === 'running' ? '#10b981' : '#374151'
                                        }} />
                                        <div>
                                            <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>{session.name}</h4>
                                            <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {session.type || 'Standard'} • {session.trade_count || 0} trades
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            fontFamily: 'monospace',
                                            fontWeight: 700,
                                            color: (session.current_pnl || 0) >= 0 ? '#10b981' : '#ef4444'
                                        }}>
                                            {formatCurrency(session.current_pnl)}
                                        </span>
                                        <span className={`badge ${session.status === 'running' ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'block', marginTop: '4px' }}>
                                            {session.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}

                        <button
                            onClick={() => navigate('/admin/sessions/new')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px dashed rgba(255,255,255,0.1)',
                                background: 'transparent',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                e.currentTarget.style.color = '#9ca3af';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <Plus size={20} />
                            Create New Session
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="admin-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Zap size={20} style={{ color: '#8b5cf6' }} />
                        Quick Actions
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left'
        }}
        onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
        }}
    >
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{label}</span>
        <span style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>{description}</span>
    </button>
);

export default AdminDashboard;
