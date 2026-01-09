/**
 * TraderMind Analytics Page
 * Comprehensive real-time trading analytics
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
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


import { cn } from '../lib/utils';

// =============================================================================
// DATA HOOKS
// =============================================================================

function useAnalyticsData() {


    return useQuery({
        queryKey: ['analytics-data'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/stats/summary`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        },
        staleTime: 30000,
        refetchInterval: 30000
    });
}

function useTradingHistory() {


    return useQuery({
        queryKey: ['trading-history'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/trades?limit=100`, {
                credentials: 'include'
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



// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({ title, value, change, changeType, icon: Icon }: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: any;
    color?: string; // Kept for interface compatibility but unused for neutral styling
}) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between mt-2">
                    <div className="text-2xl font-bold">{value}</div>
                    {change && (
                        <div className={cn(
                            "flex items-center text-xs font-medium",
                            changeType === 'positive' && "text-emerald-600 dark:text-emerald-500",
                            changeType === 'negative' && "text-red-600 dark:text-red-500",
                            changeType === 'neutral' && "text-slate-600 dark:text-slate-400"
                        )}>
                            {changeType === 'positive' && <TrendingUp className="mr-1 h-3 w-3" />}
                            {changeType === 'negative' && <TrendingDown className="mr-1 h-3 w-3" />}
                            {change}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// MAIN ANALYTICS PAGE
// =============================================================================

export default function Analytics() {
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
        const wins = trades.filter((t: any) => Number(t.pnl || 0) > 0).length;
        const losses = trades.filter((t: any) => Number(t.pnl || 0) < 0).length;

        return {
            totalTrades,
            winRate: winRate || (totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0),
            totalProfit,
            todayPnl,
            wins,
            losses,
            avgWin: trades.filter((t: any) => Number(t.pnl || 0) > 0).reduce((acc: number, t: any) => acc + Number(t.pnl || 0), 0) / (wins || 1),
            avgLoss: Math.abs(trades.filter((t: any) => Number(t.pnl || 0) < 0).reduce((acc: number, t: any) => acc + Number(t.pnl || 0), 0) / (losses || 1)),
            profitFactor: losses > 0 ? (trades.filter((t: any) => Number(t.pnl || 0) > 0).reduce((acc: number, t: any) => acc + Number(t.pnl || 0), 0) /
                Math.abs(trades.filter((t: any) => Number(t.pnl || 0) < 0).reduce((acc: number, t: any) => acc + Number(t.pnl || 0), 0) || 1)).toFixed(2) : '∞',
        };
    }, [stats, history]);

    // Chart data
    const performanceData = useMemo(() => {
        const trades = history?.trades || [];
        const grouped = new Map<string, { profit: number; trades: number; wins: number }>();

        trades.forEach((trade: any) => {
            const date = new Date(trade.created_at || trade.executed_at || Date.now());
            const key = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const entry = grouped.get(key) || { profit: 0, trades: 0, wins: 0 };
            const pnl = Number(trade.pnl || 0);
            entry.profit += pnl;
            entry.trades += 1;
            if (pnl > 0) entry.wins += 1;
            grouped.set(key, entry);
        });

        return Array.from(grouped.entries()).slice(-7).map(([name, data]) => ({
            name,
            profit: Number(data.profit.toFixed(2)),
            trades: data.trades,
            winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
        }));
    }, [history]);

    const distributionData = [
        { name: 'R_100', value: 35, color: '#1d4ed8' },
        { name: 'R_50', value: 25, color: '#475569' },
        { name: 'JD100', value: 20, color: '#334155' },
        { name: 'R_25', value: 12, color: '#94a3b8' },
        { name: 'Other', value: 8, color: '#cbd5e1' },
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                        <PieChartIcon className="w-8 h-8 text-primary" />
                        Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Real-time trading performance metrics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Time Range Selector */}
                    <div className="flex items-center bg-muted rounded-lg p-1">
                        {timeRanges.map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ease-out",
                                    timeRange === range
                                        ? "bg-background text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition-colors"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        <span className="text-sm font-medium">Refresh</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span className="text-sm">Export</span>
                    </button>
                </div>
            </div>

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
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Performance Over Time</CardTitle>
                        <CardDescription>Daily profit/loss trend analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                            color: 'hsl(var(--foreground))'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Market Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Market Distribution</CardTitle>
                        <CardDescription>Volume concentration</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
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
                                        <span className="text-sm text-muted-foreground">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-medium">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Strategy Performance */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle>Strategy Performance</CardTitle>
                        <CardDescription>Win rate benchmarks</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 text-muted-foreground px-3 py-1 rounded-full text-xs font-medium">
                        <Zap className="w-4 h-4" />
                        <span>5 Active</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={strategyData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '6px',
                                    }}
                                />
                                <Bar dataKey="winRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            <span className="text-sm font-medium text-muted-foreground">Avg Win</span>
                        </div>
                        <p className="text-2xl font-bold tracking-tight">
                            ${metrics.avgWin.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            <span className="text-sm font-medium text-muted-foreground">Avg Loss</span>
                        </div>
                        <p className="text-2xl font-bold tracking-tight">
                            ${metrics.avgLoss.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Sessions</span>
                        </div>
                        <p className="text-2xl font-bold tracking-tight">
                            {stats?.sessions?.total || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Risk Score</span>
                        </div>
                        <p className="text-2xl font-bold tracking-tight">
                            Low
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
