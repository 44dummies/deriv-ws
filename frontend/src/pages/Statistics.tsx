/**
 * TraderMind Statistics Page
 * Real-time performance analytics and trading metrics
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore } from '../stores/useThemeStore';
import { 
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
    TrendingUp, Target, Loader2, Activity, 
    DollarSign, BarChart3, PieChart as PieChartIcon, Zap, RefreshCw, 
    ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

// =============================================================================
// HOOKS
// =============================================================================

function useRealStats() {
    const { session } = useAuthStore();
    return useQuery({
        queryKey: ['detailed-stats'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/stats/summary`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 30000,
        refetchInterval: 30000,
        enabled: !!session?.access_token
    });
}

function useTradingHistory() {
    const { session } = useAuthStore();
    return useQuery({
        queryKey: ['trading-history'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/trades?limit=100`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            if (!res.ok) return { trades: [] };
            return res.json();
        },
        staleTime: 15000,
        refetchInterval: 15000,
        enabled: !!session?.access_token
    });
}

// =============================================================================
// COMPONENTS
// =============================================================================

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
    const { isDarkMode } = useThemeStore();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-2xl border overflow-hidden",
                isDarkMode 
                    ? "bg-gray-900/50 backdrop-blur-xl border-white/10"
                    : "bg-white/80 backdrop-blur-xl border-black/5",
                className
            )}
        >
            {children}
        </motion.div>
    );
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    color: string;
}) {
    const { isDarkMode } = useThemeStore();
    
    const colorStyles: Record<string, { bg: string; icon: string; text: string }> = {
        blue: { bg: 'from-blue-500/20 to-blue-600/10', icon: 'bg-blue-500', text: 'text-blue-400' },
        emerald: { bg: 'from-emerald-500/20 to-emerald-600/10', icon: 'bg-emerald-500', text: 'text-emerald-400' },
        purple: { bg: 'from-purple-500/20 to-purple-600/10', icon: 'bg-purple-500', text: 'text-purple-400' },
        orange: { bg: 'from-orange-500/20 to-orange-600/10', icon: 'bg-orange-500', text: 'text-orange-400' },
        cyan: { bg: 'from-cyan-500/20 to-cyan-600/10', icon: 'bg-cyan-500', text: 'text-cyan-400' },
        pink: { bg: 'from-pink-500/20 to-pink-600/10', icon: 'bg-pink-500', text: 'text-pink-400' },
    };

    const styles = colorStyles[color] ?? colorStyles.blue;

    return (
        <GlassCard className="p-5">
            <div className="flex items-start justify-between">
                <div className={cn("p-3 rounded-xl shadow-lg", styles?.icon ?? 'bg-blue-500')}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {trend && trend !== 'neutral' && (
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                        trend === 'up' ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    )}>
                        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    </div>
                )}
            </div>
            <div className="mt-4">
                <p className={cn(
                    "text-xs font-medium uppercase tracking-wider",
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                )}>{title}</p>
                <p className={cn(
                    "text-3xl font-bold tracking-tight mt-1",
                    isDarkMode ? "text-white" : "text-gray-900"
                )}>{value}</p>
                {subtitle && (
                    <p className={cn(
                        "text-xs mt-1",
                        styles?.text ?? 'text-blue-400'
                    )}>{subtitle}</p>
                )}
            </div>
        </GlassCard>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Statistics() {
    const { isDarkMode } = useThemeStore();
    const { refetch: refetchStats } = useRealStats();
    const { data: tradesData, isLoading: tradesLoading } = useTradingHistory();
    
    const trades = tradesData?.trades || [];
    const isLoading = tradesLoading;

    // Calculate real metrics from trades
    const metrics = useMemo(() => {
        if (!trades.length) return {
            totalTrades: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            totalProfit: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0,
            maxDrawdown: 0,
            bestTrade: 0,
            worstTrade: 0
        };

        const wins = trades.filter((t: any) => t.status === 'WIN' || (t.pnl && t.pnl > 0));
        const losses = trades.filter((t: any) => t.status === 'LOSS' || (t.pnl && t.pnl < 0));
        
        const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
        const totalWins = wins.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
        const totalLosses = Math.abs(losses.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0));
        
        const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
        const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
        const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

        const pnlValues = trades.map((t: any) => t.pnl || 0);
        const bestTrade = Math.max(...pnlValues, 0);
        const worstTrade = Math.min(...pnlValues, 0);

        // Calculate max drawdown
        let peak = 0;
        let maxDrawdown = 0;
        let runningTotal = 0;
        trades.forEach((t: any) => {
            runningTotal += (t.pnl || 0);
            if (runningTotal > peak) peak = runningTotal;
            const drawdown = peak - runningTotal;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });

        return {
            totalTrades: trades.length,
            wins: wins.length,
            losses: losses.length,
            winRate: winRate.toFixed(1),
            totalProfit,
            avgWin,
            avgLoss,
            profitFactor: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2),
            maxDrawdown,
            bestTrade,
            worstTrade
        };
    }, [trades]);

    // Generate performance chart data
    const performanceData = useMemo(() => {
        if (!trades.length) return [];

        // Group by day
        const grouped: Record<string, { profit: number; trades: number; wins: number }> = {};
        trades.forEach((trade: any) => {
            const date = new Date(trade.created_at || trade.executed_at).toLocaleDateString('en-US', { 
                weekday: 'short'
            });
            if (!grouped[date]) {
                grouped[date] = { profit: 0, trades: 0, wins: 0 };
            }
            const entry = grouped[date]!;
            entry.profit += (trade.pnl || 0);
            entry.trades += 1;
            if (trade.status === 'WIN' || (trade.pnl && trade.pnl > 0)) {
                entry.wins += 1;
            }
        });

        return Object.entries(grouped).map(([day, data]) => {
            const entry = data ?? { profit: 0, trades: 0, wins: 0 };
            return {
                day,
                profit: Number(entry.profit.toFixed(2)),
                trades: entry.trades,
                winRate: entry.trades > 0 ? Math.round((entry.wins / entry.trades) * 100) : 0
            };
        }).slice(-7);
    }, [trades]);

    // Market distribution
    const marketDistribution = useMemo(() => {
        if (!trades.length) return [];

        const counts: Record<string, number> = {};
        trades.forEach((trade: any) => {
            const market = trade.market || 'Unknown';
            counts[market] = (counts[market] || 0) + 1;
        });

        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        return Object.entries(counts).map(([name, value], idx) => ({
            name,
            value,
            color: colors[idx % colors.length]
        }));
    }, [trades]);

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className={cn(
                                "text-3xl lg:text-4xl font-bold tracking-tight",
                                isDarkMode ? "text-white" : "text-gray-900"
                            )}>Performance Analytics</h1>
                            <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                                Real-time trading statistics and insights
                            </p>
                        </div>
                    </div>
                </motion.div>

                <button
                    onClick={() => refetchStats()}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                        isDarkMode 
                            ? "bg-white/5 border-white/10 hover:bg-white/10"
                            : "bg-gray-100 border-black/5 hover:bg-gray-200"
                    )}
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Trades"
                    value={metrics.totalTrades}
                    subtitle={`${metrics.wins}W / ${metrics.losses}L`}
                    icon={Activity}
                    trend={metrics.totalTrades > 0 ? 'up' : 'neutral'}
                    color="blue"
                />
                <StatCard
                    title="Win Rate"
                    value={`${metrics.winRate}%`}
                    subtitle={Number(metrics.winRate) >= 50 ? 'Above target' : 'Below target'}
                    icon={Target}
                    trend={Number(metrics.winRate) >= 50 ? 'up' : 'down'}
                    color="emerald"
                />
                <StatCard
                    title="Total Profit"
                    value={`$${metrics.totalProfit.toFixed(2)}`}
                    subtitle={metrics.totalProfit >= 0 ? 'Profitable' : 'In loss'}
                    icon={DollarSign}
                    trend={metrics.totalProfit >= 0 ? 'up' : 'down'}
                    color="cyan"
                />
                <StatCard
                    title="Profit Factor"
                    value={metrics.profitFactor}
                    subtitle={Number(metrics.profitFactor) >= 1.5 ? 'Excellent' : 'Needs improvement'}
                    icon={TrendingUp}
                    trend={Number(metrics.profitFactor) >= 1.5 ? 'up' : 'down'}
                    color="purple"
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-4">
                    <div className={cn(
                        "text-xs font-medium uppercase tracking-wider",
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>Avg Win</div>
                    <div className="text-xl font-bold mt-1 text-emerald-400">
                        ${metrics.avgWin.toFixed(2)}
                    </div>
                </GlassCard>
                <GlassCard className="p-4">
                    <div className={cn(
                        "text-xs font-medium uppercase tracking-wider",
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>Avg Loss</div>
                    <div className="text-xl font-bold mt-1 text-red-400">
                        ${metrics.avgLoss.toFixed(2)}
                    </div>
                </GlassCard>
                <GlassCard className="p-4">
                    <div className={cn(
                        "text-xs font-medium uppercase tracking-wider",
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>Best Trade</div>
                    <div className="text-xl font-bold mt-1 text-emerald-400">
                        +${metrics.bestTrade.toFixed(2)}
                    </div>
                </GlassCard>
                <GlassCard className="p-4">
                    <div className={cn(
                        "text-xs font-medium uppercase tracking-wider",
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>Max Drawdown</div>
                    <div className="text-xl font-bold mt-1 text-orange-400">
                        ${metrics.maxDrawdown.toFixed(2)}
                    </div>
                </GlassCard>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Chart */}
                <GlassCard className="lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            <h3 className={cn(
                                "text-lg font-bold",
                                isDarkMode ? "text-white" : "text-gray-900"
                            )}>Daily Performance</h3>
                        </div>
                    </div>

                    {performanceData.length > 0 ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <defs>
                                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid 
                                        strokeDasharray="3 3" 
                                        stroke={isDarkMode ? "#1F2937" : "#E5E7EB"} 
                                        vertical={false} 
                                    />
                                    <XAxis 
                                        dataKey="day" 
                                        stroke={isDarkMode ? "#6B7280" : "#9CA3AF"} 
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis 
                                        stroke={isDarkMode ? "#6B7280" : "#9CA3AF"} 
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `$${v}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                            borderRadius: '12px',
                                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                                        }}
                                        labelStyle={{ color: isDarkMode ? '#9CA3AF' : '#4B5563' }}
                                        itemStyle={{ color: isDarkMode ? '#fff' : '#111827' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="profit"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        fill="url(#profitGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className={cn(
                            "h-[300px] flex items-center justify-center border-2 border-dashed rounded-xl",
                            isDarkMode ? "border-white/10" : "border-black/10"
                        )}>
                            <div className="text-center">
                                <Clock className={cn(
                                    "w-12 h-12 mx-auto mb-3",
                                    isDarkMode ? "text-gray-600" : "text-gray-400"
                                )} />
                                <p className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                                    No trade data yet. Start trading to see performance.
                                </p>
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* Market Distribution */}
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <PieChartIcon className="w-5 h-5 text-purple-400" />
                        <h3 className={cn(
                            "text-lg font-bold",
                            isDarkMode ? "text-white" : "text-gray-900"
                        )}>Market Distribution</h3>
                    </div>

                    {marketDistribution.length > 0 ? (
                        <>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={marketDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {marketDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                                borderRadius: '12px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 mt-4">
                                {marketDistribution.map((market) => (
                                    <div key={market.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: market.color }}
                                            />
                                            <span className={cn(
                                                "text-sm",
                                                isDarkMode ? "text-gray-400" : "text-gray-600"
                                            )}>{market.name}</span>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-medium",
                                            isDarkMode ? "text-white" : "text-gray-900"
                                        )}>{market.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className={cn(
                            "h-[200px] flex items-center justify-center border-2 border-dashed rounded-xl",
                            isDarkMode ? "border-white/10" : "border-black/10"
                        )}>
                            <p className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                                No data available
                            </p>
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Recent Trades Table */}
            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <h3 className={cn(
                        "text-lg font-bold",
                        isDarkMode ? "text-white" : "text-gray-900"
                    )}>Recent Trades</h3>
                </div>

                {trades.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className={cn(
                                    "border-b text-xs uppercase tracking-wider",
                                    isDarkMode ? "border-white/10 text-gray-500" : "border-black/10 text-gray-400"
                                )}>
                                    <th className="text-left py-3 px-4 font-medium">Time</th>
                                    <th className="text-left py-3 px-4 font-medium">Market</th>
                                    <th className="text-left py-3 px-4 font-medium">Type</th>
                                    <th className="text-right py-3 px-4 font-medium">Stake</th>
                                    <th className="text-right py-3 px-4 font-medium">P&L</th>
                                    <th className="text-center py-3 px-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.slice(0, 10).map((trade: any, idx: number) => (
                                    <tr 
                                        key={trade.id || idx} 
                                        className={cn(
                                            "border-b transition-colors",
                                            isDarkMode 
                                                ? "border-white/5 hover:bg-white/5" 
                                                : "border-black/5 hover:bg-gray-50"
                                        )}
                                    >
                                        <td className={cn(
                                            "py-3 px-4 text-sm",
                                            isDarkMode ? "text-gray-400" : "text-gray-500"
                                        )}>
                                            {new Date(trade.created_at).toLocaleString()}
                                        </td>
                                        <td className={cn(
                                            "py-3 px-4 text-sm font-medium",
                                            isDarkMode ? "text-white" : "text-gray-900"
                                        )}>
                                            {trade.market}
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                trade.contract_type === 'CALL' || trade.contract_type === 'RISE'
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : "bg-red-500/20 text-red-400"
                                            )}>
                                                {trade.contract_type}
                                            </span>
                                        </td>
                                        <td className={cn(
                                            "py-3 px-4 text-sm text-right font-mono",
                                            isDarkMode ? "text-white" : "text-gray-900"
                                        )}>
                                            ${trade.stake?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className={cn(
                                            "py-3 px-4 text-sm text-right font-mono font-medium",
                                            (trade.pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                                        )}>
                                            {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-bold",
                                                trade.status === 'WIN' 
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : trade.status === 'LOSS'
                                                        ? "bg-red-500/20 text-red-400"
                                                        : "bg-orange-500/20 text-orange-400"
                                            )}>
                                                {trade.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className={cn(
                        "py-12 text-center border-2 border-dashed rounded-xl",
                        isDarkMode ? "border-white/10" : "border-black/10"
                    )}>
                        <Activity className={cn(
                            "w-12 h-12 mx-auto mb-3",
                            isDarkMode ? "text-gray-600" : "text-gray-400"
                        )} />
                        <p className={isDarkMode ? "text-gray-500" : "text-gray-400"}>
                            No trades recorded yet
                        </p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
