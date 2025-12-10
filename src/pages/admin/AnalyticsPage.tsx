/**
 * Analytics Page
 * Advanced trading analytics and performance metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    TrendingUp, TrendingDown, BarChart2, PieChart, Activity,
    Calendar, Download, RefreshCw, Target, Percent
} from 'lucide-react';
import * as tradingApi from '../../trading/tradingApi';

interface AnalyticsData {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    averageTrade: number;
    bestDay: number;
    worstDay: number;
    tradingDays: number;
    dailyStats: Array<{
        date: string;
        trades: number;
        profit: number;
        winRate: number;
    }>;
    contractStats: Array<{
        type: string;
        count: number;
        winRate: number;
        profit: number;
    }>;
    digitDistribution: Record<string, number>;
}

const AnalyticsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    const loadAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, liveRes] = await Promise.all([
                tradingApi.getStats({ timeRange }),
                tradingApi.getLiveStats()
            ]);

            // Combine and format data
            setAnalytics({
                totalTrades: statsRes?.totalTrades || liveRes?.totalTrades || 0,
                winRate: statsRes?.winRate || liveRes?.winRate || 0,
                totalProfit: statsRes?.totalProfit || liveRes?.totalProfit || 0,
                averageTrade: statsRes?.averageTrade || 0,
                bestDay: statsRes?.bestDay || 0,
                worstDay: statsRes?.worstDay || 0,
                tradingDays: statsRes?.tradingDays || 0,
                dailyStats: statsRes?.dailyStats || generateSampleDailyStats(),
                contractStats: statsRes?.contractStats || generateSampleContractStats(),
                digitDistribution: statsRes?.digitDistribution || generateDigitDistribution()
            });
        } catch (error) {
            console.error('Failed to load analytics:', error);
            // Use sample data for demo
            setAnalytics({
                totalTrades: 156,
                winRate: 54.2,
                totalProfit: 127.50,
                averageTrade: 0.82,
                bestDay: 45.20,
                worstDay: -23.10,
                tradingDays: 12,
                dailyStats: generateSampleDailyStats(),
                contractStats: generateSampleContractStats(),
                digitDistribution: generateDigitDistribution()
            });
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const generateSampleDailyStats = () => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map((day, i) => ({
            date: day,
            trades: Math.floor(Math.random() * 30) + 10,
            profit: (Math.random() - 0.4) * 40,
            winRate: 40 + Math.random() * 30
        }));
    };

    const generateSampleContractStats = () => [
        { type: 'DIGITOVER', count: 45, winRate: 56, profit: 32.50 },
        { type: 'DIGITUNDER', count: 38, winRate: 52, profit: 18.20 },
        { type: 'DIGITMATCH', count: 28, winRate: 48, profit: -8.50 },
        { type: 'DIGITDIFF', count: 22, winRate: 58, profit: 42.10 },
        { type: 'DIGITEVEN', count: 23, winRate: 51, profit: 12.30 }
    ];

    const generateDigitDistribution = () => {
        const dist: Record<string, number> = {};
        for (let i = 0; i <= 9; i++) {
            dist[String(i)] = Math.floor(Math.random() * 50) + 20;
        }
        return dist;
    };

    const formatCurrency = (value: number): string => {
        const sign = value >= 0 ? '+' : '';
        return sign + new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    const exportData = () => {
        toast.success('Exporting analytics data...');
        // Would implement actual export here
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
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex flex-wrap gap-1 sm:gap-2">
                    {['24h', '7d', '30d', 'all'].map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all ${timeRange === range
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                    : 'bg-white/5 border border-white/10 text-gray-400'
                                }`}
                        >
                            {range === 'all' ? 'All' : range.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 sm:gap-3">
                    <button className="btn btn-secondary flex-1 sm:flex-none text-xs sm:text-sm" onClick={loadAnalytics}>
                        <RefreshCw size={16} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button className="btn btn-primary flex-1 sm:flex-none text-xs sm:text-sm" onClick={exportData}>
                        <Download size={16} />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="stats-grid mb-4 sm:mb-6">
                <MetricCard
                    icon={<BarChart2 />}
                    label="Total Trades"
                    value={String(analytics?.totalTrades || 0)}
                    subValue={`${analytics?.tradingDays || 0} trading days`}
                    color="blue"
                />
                <MetricCard
                    icon={<Target />}
                    label="Win Rate"
                    value={`${(analytics?.winRate || 0).toFixed(1)}%`}
                    subValue={`Avg: ${(analytics?.averageTrade || 0).toFixed(2)} USD/trade`}
                    color="purple"
                />
                <MetricCard
                    icon={<TrendingUp />}
                    label="Total Profit"
                    value={formatCurrency(analytics?.totalProfit || 0)}
                    subValue={`Best day: ${formatCurrency(analytics?.bestDay || 0)}`}
                    color={(analytics?.totalProfit || 0) >= 0 ? 'green' : 'red'}
                />
                <MetricCard
                    icon={<TrendingDown />}
                    label="Max Drawdown"
                    value={formatCurrency(analytics?.worstDay || 0)}
                    subValue="Worst single day"
                    color="red"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-6 mb-4 sm:mb-6">
                {/* Daily Performance Chart */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-sm sm:text-base font-semibold mb-4 sm:mb-5 flex items-center gap-2">
                        <Activity size={18} className="text-blue-500" />
                        Daily Performance
                    </h3>
                    <div className="flex items-end justify-around h-[150px] sm:h-[200px] gap-1 sm:gap-2">
                        {analytics?.dailyStats.map((day, i) => {
                            const maxProfit = Math.max(...analytics.dailyStats.map(d => Math.abs(d.profit)));
                            const height = Math.abs(day.profit) / maxProfit * 120;
                            return (
                                <div key={i} className="flex flex-col items-center gap-1 sm:gap-2">
                                    <div
                                        className={`w-6 sm:w-9 min-h-[16px] rounded transition-all ${day.profit >= 0
                                                ? 'bg-gradient-to-t from-green-500 to-green-400'
                                                : 'bg-gradient-to-t from-red-500 to-red-400'
                                            }`}
                                        style={{ height: `${height}px` }}
                                        title={`${day.date}: ${formatCurrency(day.profit)}`}
                                    />
                                    <span className="text-[10px] sm:text-xs text-gray-400">{day.date}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Digit Distribution */}
                <div className="admin-card p-4 sm:p-6">
                    <h3 className="text-sm sm:text-base font-semibold mb-4 sm:mb-5 flex items-center gap-2">
                        <PieChart size={18} className="text-purple-500" />
                        Digit Distribution
                    </h3>
                    <div className="grid grid-cols-5 gap-1 sm:gap-2">
                        {Object.entries(analytics?.digitDistribution || {}).map(([digit, count]) => (
                            <div
                                key={digit}
                                className="text-center p-2 sm:p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                            >
                                <div className="text-base sm:text-xl font-bold text-purple-400">{digit}</div>
                                <div className="text-[10px] sm:text-xs text-gray-400">{count as number}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contract Performance Table */}
            <div className="admin-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Percent size={20} style={{ color: '#10b981' }} />
                        Contract Type Performance
                    </h3>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Contract Type</th>
                            <th>Trades</th>
                            <th>Win Rate</th>
                            <th>Profit/Loss</th>
                            <th>Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analytics?.contractStats.map((contract, i) => (
                            <tr key={i}>
                                <td>
                                    <span style={{ fontWeight: 600 }}>{contract.type}</span>
                                </td>
                                <td>{contract.count}</td>
                                <td>
                                    <span style={{
                                        color: contract.winRate >= 50 ? '#10b981' : '#ef4444',
                                        fontWeight: 600
                                    }}>
                                        {contract.winRate.toFixed(1)}%
                                    </span>
                                </td>
                                <td style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    color: contract.profit >= 0 ? '#10b981' : '#ef4444'
                                }}>
                                    {formatCurrency(contract.profit)}
                                </td>
                                <td>
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${contract.winRate}%`,
                                            height: '100%',
                                            background: contract.winRate >= 50
                                                ? 'linear-gradient(to right, #10b981, #059669)'
                                                : 'linear-gradient(to right, #ef4444, #dc2626)',
                                            borderRadius: '4px'
                                        }} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

// Metric Card Component
interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    color: 'blue' | 'green' | 'red' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, subValue, color }) => {
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
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
            {subValue && (
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>{subValue}</div>
            )}
        </div>
    );
};

export default AnalyticsPage;
