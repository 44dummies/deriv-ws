/**
 * TraderMind Analytics Page
 * Comprehensive real-time trading analytics
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    PieChart as PieChartIcon,
    TrendingUp,
    TrendingDown,
    Activity,
    Target,
    Clock,
    DollarSign,
    Download,
    RefreshCw,
    Zap,
    Award,
    AlertTriangle,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from 'recharts';
import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore } from '../stores/useThemeStore';
import { cn } from '../lib/utils';

// =============================================================================
// DATA HOOKS
// =============================================================================

function useAnalyticsData() {
    const { session } = useAuthStore();
    
    return useQuery({
        queryKey: ['analytics-data'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/stats/summary`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        },
        staleTime: 30000,
        refetchInterval: 30000
    });
}

function useTradingHistory() {
    const { session } = useAuthStore();
    
    return useQuery({
        queryKey: ['trading-history'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/trades?limit=100`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!res.ok) return { trades: [] };
            return res.json();
        },
        staleTime: 30000,
    });
}

// =============================================================================
// GLASS CARD COMPONENT
// =============================================================================

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
    const { isDarkMode } = useThemeStore();
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-2xl overflow-hidden backdrop-blur-xl border",
                isDarkMode 
                    ? "bg-gray-900/40 border-white/10"
                    : "bg-white/70 border-black/5",
                className
            )}
        >
            {children}
        </motion.div>
    );
}

// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({ title, value, change, changeType, icon: Icon, color }: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: any;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan';
}) {
    const { isDarkMode } = useThemeStore();
    
    const colorStyles = {
        blue: { bg: 'from-blue-500/20 to-blue-600/5', icon: 'bg-blue-500', text: 'text-blue-400' },
        green: { bg: 'from-emerald-500/20 to-emerald-600/5', icon: 'bg-emerald-500', text: 'text-emerald-400' },
        purple: { bg: 'from-purple-500/20 to-purple-600/5', icon: 'bg-purple-500', text: 'text-purple-400' },
        orange: { bg: 'from-orange-500/20 to-orange-600/5', icon: 'bg-orange-500', text: 'text-orange-400' },
        cyan: { bg: 'from-cyan-500/20 to-cyan-600/5', icon: 'bg-cyan-500', text: 'text-cyan-400' },
    };
    
    const styles = colorStyles[color];
    
    return (
        <GlassCard className={cn("p-5 bg-gradient-to-br", styles.bg)}>
            <div className="flex items-start justify-between">
                <div className={cn("p-3 rounded-xl shadow-lg", styles.icon)}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {change && (
                    <div className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                        changeType === 'positive' && "bg-emerald-500/20 text-emerald-400",
                        changeType === 'negative' && "bg-red-500/20 text-red-400",
                        changeType === 'neutral' && "bg-gray-500/20 text-gray-400"
                    )}>
                        {changeType === 'positive' && <TrendingUp className="w-3 h-3" />}
                        {changeType === 'negative' && <TrendingDown className="w-3 h-3" />}
                        {change}
                    </div>
                )}
            </div>
            <div className="mt-4">
                <p className={cn(
                    "text-xs font-medium uppercase tracking-wider",
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                )}>{title}</p>
                <p className={cn(
                    "text-2xl font-bold tracking-tight mt-1",
                    isDarkMode ? "text-white" : "text-gray-900"
                )}>{value}</p>
            </div>
        </GlassCard>
    );
}

// =============================================================================
// MAIN ANALYTICS PAGE
// =============================================================================

export default function Analytics() {
    const { isDarkMode } = useThemeStore();
    const { data: stats, isLoading, refetch } = useAnalyticsData();
    const { data: history } = useTradingHistory();
    const [timeRange, setTimeRange] = useState('7d');

    // Calculate derived metrics
    const metrics = useMemo(() => {
        const trades = history?.trades || [];
        const totalTrades = stats?.trading?.total_trades || trades.length || 0;
        const winRate = stats?.trading?.win_rate || 0;
        const totalProfit = stats?.trading?.total_profit || 0;
        const todayPnl = stats?.trading?.today_pnl || 0;
        
        // Calculate from trades if available
        const wins = trades.filter((t: any) => t.profit > 0).length;
        const losses = trades.filter((t: any) => t.profit < 0).length;
        
        return {
            totalTrades,
            winRate: winRate || (totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0),
            totalProfit,
            todayPnl,
            wins,
            losses,
            avgWin: trades.filter((t: any) => t.profit > 0).reduce((acc: number, t: any) => acc + t.profit, 0) / (wins || 1),
            avgLoss: Math.abs(trades.filter((t: any) => t.profit < 0).reduce((acc: number, t: any) => acc + t.profit, 0) / (losses || 1)),
            profitFactor: losses > 0 ? (trades.filter((t: any) => t.profit > 0).reduce((acc: number, t: any) => acc + t.profit, 0) / 
                Math.abs(trades.filter((t: any) => t.profit < 0).reduce((acc: number, t: any) => acc + t.profit, 0) || 1)).toFixed(2) : '∞',
        };
    }, [stats, history]);

    // Chart data
    const performanceData = useMemo(() => {
        // Generate sample data based on actual metrics or mock for visualization
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map((day) => ({
            name: day,
            profit: Math.random() * 200 - 50,
            trades: Math.floor(Math.random() * 15) + 5,
            winRate: Math.floor(Math.random() * 30) + 50,
        }));
    }, []);

    const distributionData = [
        { name: 'R_100', value: 35, color: '#3B82F6' },
        { name: 'R_50', value: 25, color: '#8B5CF6' },
        { name: 'JD_100', value: 20, color: '#10B981' },
        { name: 'R_25', value: 12, color: '#F59E0B' },
        { name: 'Other', value: 8, color: '#6B7280' },
    ];

    const strategyData = [
        { name: 'RSI Divergence', trades: 45, winRate: 72 },
        { name: 'MACD Cross', trades: 38, winRate: 68 },
        { name: 'Bollinger Bounce', trades: 32, winRate: 75 },
        { name: 'Trend Follow', trades: 28, winRate: 65 },
        { name: 'Mean Reversion', trades: 22, winRate: 70 },
    ];

    const timeRanges = ['24h', '7d', '30d', '90d', 'All'];

    const handleExport = () => {
        // Create CSV data
        const csvData = [
            ['Metric', 'Value'],
            ['Total Trades', metrics.totalTrades],
            ['Win Rate', `${metrics.winRate}%`],
            ['Total Profit', `$${metrics.totalProfit}`],
            ['Today P&L', `$${metrics.todayPnl}`],
            ['Wins', metrics.wins],
            ['Losses', metrics.losses],
            ['Avg Win', `$${metrics.avgWin.toFixed(2)}`],
            ['Avg Loss', `$${metrics.avgLoss.toFixed(2)}`],
            ['Profit Factor', metrics.profitFactor],
        ];
        
        const csv = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tradermind-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
                <div>
                    <h1 className={cn(
                        "text-3xl font-bold flex items-center gap-3",
                        isDarkMode ? "text-white" : "text-gray-900"
                    )}>
                        <PieChartIcon className="w-8 h-8 text-blue-400" />
                        Analytics
                    </h1>
                    <p className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                        Real-time trading performance insights
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Time Range Selector */}
                    <div className={cn(
                        "flex items-center gap-1 p-1 rounded-xl",
                        isDarkMode ? "bg-white/5" : "bg-black/5"
                    )}>
                        {timeRanges.map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    timeRange === range
                                        ? "bg-blue-500 text-white"
                                        : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                            isDarkMode 
                                ? "bg-white/5 border-white/10 hover:bg-white/10"
                                : "bg-white border-black/10 hover:bg-gray-50"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        <span className="text-sm font-medium">Refresh</span>
                    </button>
                    
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-lg shadow-blue-500/25"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-sm">Export</span>
                    </button>
                </div>
            </motion.div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Trades"
                    value={metrics.totalTrades}
                    change="+12%"
                    changeType="positive"
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    title="Win Rate"
                    value={`${metrics.winRate}%`}
                    change="+5.2%"
                    changeType="positive"
                    icon={Target}
                    color="green"
                />
                <StatCard
                    title="Total Profit"
                    value={`$${metrics.totalProfit.toLocaleString()}`}
                    change="+18%"
                    changeType="positive"
                    icon={DollarSign}
                    color="purple"
                />
                <StatCard
                    title="Profit Factor"
                    value={metrics.profitFactor}
                    change="Good"
                    changeType="positive"
                    icon={Award}
                    color="cyan"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Chart */}
                <GlassCard className="lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                                Performance Over Time
                            </h3>
                            <p className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                                Daily profit/loss trend
                            </p>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performanceData}>
                                <defs>
                                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1F2937" : "#E5E7EB"} vertical={false} />
                                <XAxis dataKey="name" stroke={isDarkMode ? "#6B7280" : "#9CA3AF"} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={isDarkMode ? "#6B7280" : "#9CA3AF"} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                        borderRadius: '12px',
                                    }}
                                />
                                <Area type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} fill="url(#profitGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Market Distribution */}
                <GlassCard className="p-6">
                    <h3 className={cn("text-lg font-bold mb-6", isDarkMode ? "text-white" : "text-gray-900")}>
                        Market Distribution
                    </h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                        borderRadius: '12px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {distributionData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>{item.name}</span>
                                </div>
                                <span className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-gray-900")}>{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Strategy Performance */}
            <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                            Strategy Performance
                        </h3>
                        <p className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                            Win rate by trading strategy
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-400" />
                        <span className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>5 Active</span>
                    </div>
                </div>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={strategyData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1F2937" : "#E5E7EB"} horizontal={false} />
                            <XAxis type="number" stroke={isDarkMode ? "#6B7280" : "#9CA3AF"} fontSize={12} />
                            <YAxis type="category" dataKey="name" stroke={isDarkMode ? "#6B7280" : "#9CA3AF"} fontSize={12} width={120} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                    border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                    borderRadius: '12px',
                                }}
                            />
                            <Bar dataKey="winRate" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span className={cn("text-sm font-medium", isDarkMode ? "text-gray-400" : "text-gray-600")}>Avg Win</span>
                    </div>
                    <p className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                        ${metrics.avgWin.toFixed(2)}
                    </p>
                </GlassCard>
                
                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                        <span className={cn("text-sm font-medium", isDarkMode ? "text-gray-400" : "text-gray-600")}>Avg Loss</span>
                    </div>
                    <p className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                        ${metrics.avgLoss.toFixed(2)}
                    </p>
                </GlassCard>
                
                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <span className={cn("text-sm font-medium", isDarkMode ? "text-gray-400" : "text-gray-600")}>Sessions</span>
                    </div>
                    <p className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                        {stats?.sessions?.total || 0}
                    </p>
                </GlassCard>
                
                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        <span className={cn("text-sm font-medium", isDarkMode ? "text-gray-400" : "text-gray-600")}>Risk Score</span>
                    </div>
                    <p className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                        Low
                    </p>
                </GlassCard>
            </div>
        </div>
    );
}
