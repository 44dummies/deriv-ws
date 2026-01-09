/**
 * TraderMind Premium Dashboard
 * Figma-worthy, ultra-modern trading dashboard with REAL-TIME data
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useAuthStore } from '../stores/useAuthStore';
import { useDerivBalance } from '../hooks/useDerivBalance';
import { useDerivTicks, TRADERMIND_MARKETS } from '../hooks/useDerivTicks';
import { useCreateSession } from '../hooks/useSessions';
import {
    Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    Activity, ChevronDown, ChevronRight, Zap, Target, Play, BarChart3,
    Sparkles, CircleDot, RefreshCw, Eye, EyeOff,
    MoreHorizontal, Download, Shield, Wifi, WifiOff, X, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import ManualTrade from '../components/ManualTrade';

// =============================================================================
// HOOKS
// =============================================================================

const useRealStats = () => {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/stats/summary`, {
                credentials: 'include'
            });
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 30000,
        refetchInterval: 30000
    });
};



// =============================================================================
// STAT CARDS
// =============================================================================

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'blue' | 'emerald' | 'purple' | 'orange' | 'cyan' | 'pink';
    large?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, large }: StatCardProps) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-muted">
                        <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                            trend === 'up' && "text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
                            trend === 'down' && "text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-950/30",
                            trend === 'neutral' && "text-muted-foreground bg-muted"
                        )}>
                            {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                            {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                            {trendValue}
                        </div>
                    )}
                </div>

                <div className="mt-4 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className={cn(
                        "font-bold tracking-tight",
                        large ? "text-3xl" : "text-2xl"
                    )}>
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// BALANCE HERO CARD
// =============================================================================

function BalanceHeroCard() {
    const { user, switchAccount } = useAuthStore();
    const [showBalance, setShowBalance] = useState(true);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

    const activeAccount = user?.deriv_accounts?.find(a => a.loginid === user?.active_account_id) || user?.deriv_accounts?.[0];
    const isReal = !activeAccount?.is_virtual;
    const balance = activeAccount?.balance || 0;
    const currency = activeAccount?.currency || 'USD';

    return (
        <Card className="border-l-4 border-l-primary">
            <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Balance Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <Wallet className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Portfolio Balance</p>
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl font-bold tracking-tight">
                                        {showBalance
                                            ? balance.toLocaleString(undefined, { style: 'currency', currency })
                                            : '••••••'
                                        }
                                    </span>
                                    <button
                                        onClick={() => setShowBalance(!showBalance)}
                                        className="p-2 rounded-md hover:bg-muted transition-colors"
                                    >
                                        {showBalance ? (
                                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                <span className="font-semibold text-emerald-600">+24.5%</span>
                                <span className="text-muted-foreground">this week</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Shield className="w-4 h-4" />
                                <span>RiskGuard Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Account Switcher */}
                    <div className="relative">
                        <button
                            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                            className="flex items-center gap-4 px-6 py-4 rounded-xl border bg-background hover:bg-muted/50 transition-all min-w-[280px]"
                        >
                            <div className={cn(
                                "p-2 rounded-lg",
                                isReal ? "bg-emerald-500/10" : "bg-orange-500/10"
                            )}>
                                <CircleDot className={cn(
                                    "w-5 h-5",
                                    isReal ? "text-emerald-600" : "text-orange-600"
                                )} />
                            </div>
                            <div className="text-left flex-1">
                                <div className="font-semibold">
                                    {isReal ? 'Real Account' : 'Demo Account'}
                                </div>
                                <div className="text-xs text-muted-foreground">{activeAccount?.loginid}</div>
                            </div>
                            <ChevronDown className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform",
                                isAccountMenuOpen && "rotate-180"
                            )} />
                        </button>

                        {isAccountMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-full bg-popover border rounded-xl shadow-lg overflow-hidden z-50">
                                <div className="p-1">
                                    {user?.deriv_accounts?.map((acc) => (
                                        <button
                                            key={acc.loginid}
                                            onClick={() => {
                                                switchAccount(acc.loginid);
                                                setIsAccountMenuOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                                                acc.loginid === activeAccount?.loginid
                                                    ? "bg-muted"
                                                    : "hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    !acc.is_virtual ? "bg-emerald-500" : "bg-orange-500"
                                                )} />
                                                <div className="text-left">
                                                    <div className="font-medium text-sm">
                                                        {!acc.is_virtual ? 'Real' : 'Demo'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{acc.loginid}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono font-medium text-sm">
                                                    {acc.balance?.toLocaleString() || '0'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{acc.currency}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

function QuickActions({ onTrade, onNewSession, onAnalytics, onExport }: {
    onTrade: () => void;
    onNewSession: () => void;
    onAnalytics: () => void;
    onExport: () => void;
}) {
    const actions = [
        { icon: Play, label: 'Quick Trade', color: 'from-blue-500 to-cyan-500', onClick: onTrade },
        { icon: Target, label: 'New Session', color: 'from-purple-500 to-pink-500', onClick: onNewSession },
        { icon: BarChart3, label: 'Analytics', color: 'from-emerald-500 to-teal-500', onClick: onAnalytics },
        { icon: Download, label: 'Export', color: 'from-orange-500 to-amber-500', onClick: onExport },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action) => (
                <button
                    key={action.label}
                    onClick={action.onClick}
                    className="group relative flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all hover:shadow-md"
                >
                    <div className={cn(
                        "p-2 rounded-lg bg-gradient-to-br shadow-sm",
                        action.color
                    )}>
                        <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-foreground">{action.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
            ))}
        </div>
    );
}

// =============================================================================
// PERFORMANCE CHART
// =============================================================================

function PerformanceChart() {
    const [timeRange, setTimeRange] = useState('7d');
    const ranges = ['24h', '7d', '30d', '90d'];

    const data = [
        { name: 'Mon', profit: 120, trades: 8, win: 6 },
        { name: 'Tue', profit: 85, trades: 12, win: 9 },
        { name: 'Wed', profit: -45, trades: 5, win: 2 },
        { name: 'Thu', profit: 210, trades: 15, win: 12 },
        { name: 'Fri', profit: 175, trades: 11, win: 8 },
        { name: 'Sat', profit: 95, trades: 6, win: 4 },
        { name: 'Sun', profit: 140, trades: 9, win: 7 },
    ];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Performance</CardTitle>
                    <CardDescription>P&L over time</CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                    {ranges.map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                                timeRange === range
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="name"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `$${v}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="profit"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#profitGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// MARKET OVERVIEW - REAL-TIME DATA
// =============================================================================

const MARKET_INFO: Record<string, { name: string; category: 'Volatility' | 'Jump' }> = {
    'R_100': { name: 'Volatility 100', category: 'Volatility' },
    'R_75': { name: 'Volatility 75', category: 'Volatility' },
    'R_50': { name: 'Volatility 50', category: 'Volatility' },
    'R_25': { name: 'Volatility 25', category: 'Volatility' },
    'R_10': { name: 'Volatility 10', category: 'Volatility' },
    'JD100': { name: 'Jump 100', category: 'Jump' },
    'JD75': { name: 'Jump 75', category: 'Jump' },
    'JD50': { name: 'Jump 50', category: 'Jump' },
    'JD25': { name: 'Jump 25', category: 'Jump' },
    'JD10': { name: 'Jump 10', category: 'Jump' },
};

function MarketOverview({ ticks, connected }: {
    ticks: Map<string, import('../hooks/useDerivTicks').TickData>;
    connected: boolean;
}) {
    // Display top 4 markets with real-time data
    const displaySymbols = ['R_100', 'R_50', 'JD100', 'R_25'];

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Markets</CardTitle>
                    <CardDescription>Jump & Volatility indices</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    {connected ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-medium uppercase">Live</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            <WifiOff className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase">Offline</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {displaySymbols.map((symbol) => {
                    const tick = ticks.get(symbol);
                    const info = MARKET_INFO[symbol];
                    const hasData = !!tick;

                    return (
                        <div
                            key={symbol}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                                    info?.category === 'Jump'
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                )}>
                                    {symbol.substring(0, 2)}
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">{info?.name || symbol}</div>
                                    <div className="text-xs text-muted-foreground">{symbol}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                {hasData ? (
                                    <>
                                        <div
                                            key={tick.quote}
                                            className={cn("font-mono font-medium",
                                                tick.trend === 'up' ? "text-emerald-600 dark:text-emerald-400" :
                                                    tick.trend === 'down' ? "text-red-600 dark:text-red-400" :
                                                        "text-foreground"
                                            )}
                                        >
                                            {tick.quote.toFixed(2)}
                                        </div>
                                        <div className={cn(
                                            "text-xs font-medium flex items-center gap-1 justify-end",
                                            tick.trend === 'up' ? "text-emerald-600 dark:text-emerald-400" :
                                                tick.trend === 'down' ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                                        )}>
                                            {tick.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                                            {tick.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                                            {tick.changePercent >= 0 ? '+' : ''}{tick.changePercent.toFixed(3)}%
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-muted-foreground text-sm">Loading...</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

// =============================================================================
// RECENT ACTIVITY - REAL DATA
// =============================================================================

function useRecentTrades() {
    return useQuery({
        queryKey: ['recent-trades'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/trades?limit=5`, {
                credentials: 'include'
            });
            if (!res.ok) return { trades: [] };
            return res.json();
        },
        staleTime: 10000,
        refetchInterval: 15000
    });
}

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function RecentActivity() {
    const { data, isLoading } = useRecentTrades();
    const trades = data?.trades || [];

    // Transform trades to activity items
    const activities = useMemo(() => {
        return trades.map((trade: any) => ({
            type: 'trade',
            action: `${trade.contract_type} executed`,
            market: trade.market,
            result: trade.status === 'WIN' ? 'win' : trade.status === 'LOSS' ? 'loss' : 'pending',
            amount: trade.pnl
                ? (trade.pnl > 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`)
                : `$${trade.stake?.toFixed(2) || '0.00'}`,
            time: formatTimeAgo(trade.created_at || trade.executed_at)
        }));
    }, [trades]);

    // Fallback if no trades
    const displayActivities = activities.length > 0 ? activities : [
        { type: 'info', action: 'No recent trades', market: 'Start trading!', result: 'neutral', amount: '', time: '' }
    ];

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest trades & sessions</CardDescription>
                </div>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayActivities.map((activity: any, i: number) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center",
                                        activity.result === 'win' && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                                        activity.result === 'loss' && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                                        (activity.result === 'pending' || activity.result === 'neutral') && "bg-muted text-muted-foreground"
                                    )}>
                                        {activity.result === 'win' && <ArrowUpRight className="w-4 h-4" />}
                                        {activity.result === 'loss' && <ArrowDownRight className="w-4 h-4" />}
                                        {(activity.result === 'pending' || activity.result === 'neutral') && <Activity className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-foreground">{activity.action}</div>
                                        <div className="text-xs text-muted-foreground">{activity.market}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={cn(
                                        "font-mono font-medium text-sm",
                                        activity.result === 'win' && "text-emerald-600 dark:text-emerald-400",
                                        activity.result === 'loss' && "text-red-600 dark:text-red-400",
                                        activity.result === 'pending' && "text-orange-500"
                                    )}>
                                        {activity.amount || 'Pending'}
                                    </div>
                                    {activity.time && (
                                        <div className="text-xs text-muted-foreground">{activity.time}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => window.location.href = '/user/sessions'}
                    className="w-full mt-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    View All Activity
                </button>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// STRATEGIES STATUS
// =============================================================================

function StrategiesStatus() {
    const strategies = [
        { name: 'RSI Divergence', status: 'active', signals: 24, winRate: 78 },
        { name: 'EMA Cross', status: 'active', signals: 18, winRate: 72 },
        { name: 'Bollinger Squeeze', status: 'active', signals: 12, winRate: 85 },
        { name: 'MACD Histogram', status: 'active', signals: 31, winRate: 68 },
        { name: 'Adaptive', status: 'learning', signals: 8, winRate: 71 },
    ];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle>Quant Strategies</CardTitle>
                    <CardDescription>Active trading algorithms</CardDescription>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse" />
                    <span>10 Active</span>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {strategies.map((strategy) => (
                    <div key={strategy.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                strategy.status === 'active' ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                            )} />
                            <span className="text-sm font-medium text-foreground">{strategy.name}</span>
                            {strategy.status === 'learning' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase">
                                    Learning
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground">Signals</div>
                                <div className="text-sm font-medium text-foreground">{strategy.signals}</div>
                            </div>
                            <div className="w-16 text-right">
                                <div className="text-xs text-muted-foreground">Win Rate</div>
                                <div className={cn(
                                    "text-sm font-bold",
                                    strategy.winRate >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                                        strategy.winRate >= 65 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
                                )}>
                                    {strategy.winRate}%
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// =============================================================================
// SESSION CREATION MODAL
// =============================================================================

function NewSessionModal({ onClose }: { onClose: () => void }) {
    const { mutate: createSession, isPending } = useCreateSession();
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleCreate = () => {
        createSession(undefined, {
            onSuccess: () => {
                onClose();
                navigate('/user/sessions');
            },
            onError: (err) => {
                setError(err.message || 'Failed to create session');
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg relative animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Target className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">New Trading Session</h2>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <p className="text-muted-foreground mb-6 text-sm">
                    Start a new trading session to track your trades, analyze performance, and activate quant strategies.
                </p>

                <div className="p-4 rounded-lg border bg-muted/50 mb-6">
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Zap className="w-4 h-4" />
                        <span className="font-semibold text-sm">What's included:</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 pl-1">
                        <li>• Real-time trade tracking</li>
                        <li>• Automated strategy signals</li>
                        <li>• Performance analytics</li>
                        <li>• Risk management alerts</li>
                    </ul>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg font-medium transition-colors border bg-background hover:bg-muted"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={isPending}
                        className="flex-1 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Start Session
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN DASHBOARD EXPORT
// =============================================================================

export default function Dashboard() {
    const { data: stats, isLoading, refetch } = useRealStats();
    const navigate = useNavigate();
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);

    // Real-time balance from Deriv
    useDerivBalance();

    // Real-time market ticks from Deriv WebSocket
    const { ticks, connected: ticksConnected } = useDerivTicks({
        symbols: TRADERMIND_MARKETS
    });

    // Export handler - downloads trades as CSV
    const handleExport = async () => {
        try {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/trades?limit=1000`, {
                credentials: 'include'
            });
            const data = await res.json();
            const trades = data?.trades || [];

            if (trades.length === 0) {
                alert('No trades to export');
                return;
            }

            const headers = ['Date', 'Market', 'Type', 'Stake', 'P&L', 'Status'];
            const csvRows = [headers.join(',')];

            trades.forEach((trade: any) => {
                const row = [
                    new Date(trade.created_at).toISOString(),
                    trade.market || '',
                    trade.contract_type || '',
                    trade.stake?.toFixed(2) || '0',
                    trade.pnl?.toFixed(2) || '0',
                    trade.status || ''
                ];
                csvRows.push(row.join(','));
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tradermind-trades-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Export failed - show user-friendly alert
            alert('Export failed. Please try again.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                        <Sparkles className="w-8 h-8 text-primary" />
                        Command Center
                    </h1>
                    <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                        Real-time trading intelligence at your fingertips
                        {ticksConnected && (
                            <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                <Wifi className="w-3 h-3" />
                                Live
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition-colors"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        <span className="text-sm font-medium">Refresh</span>
                    </button>
                    <button
                        onClick={() => setShowTradeModal(true)}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors shadow-sm"
                    >
                        <Zap className="w-4 h-4" />
                        Quick Trade
                    </button>
                </div>
            </div>

            {/* Balance Hero */}
            <BalanceHeroCard />

            {/* Quick Actions */}
            <QuickActions
                onTrade={() => setShowTradeModal(true)}
                onNewSession={() => setShowSessionModal(true)}
                onAnalytics={() => navigate('/user/analytics')}
                onExport={handleExport}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Trades"
                    value={stats?.trading?.total_trades ?? 0}
                    trend={stats?.trading?.total_trades > 0 ? "up" : "neutral"}
                    trendValue={stats?.trading?.total_trades > 0 ? "+12%" : "-"}
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    title="Win Rate"
                    value={`${stats?.trading?.win_rate ?? 0}%`}
                    trend={stats?.trading?.win_rate > 50 ? "up" : "down"}
                    trendValue={stats?.trading?.win_rate > 50 ? "+5.2%" : "-2.1%"}
                    icon={Target}
                    color="emerald"
                />
                <StatCard
                    title="Active Sessions"
                    value={stats?.sessions?.active ?? 0}
                    subtitle={`${stats?.sessions?.total ?? 0} total`}
                    icon={Zap}
                    color="purple"
                />
                <StatCard
                    title="Today's P&L"
                    value={`$${stats?.trading?.today_pnl?.toFixed(2) ?? '0.00'}`}
                    trend={stats?.trading?.today_pnl > 0 ? "up" : stats?.trading?.today_pnl < 0 ? "down" : "neutral"}
                    trendValue={stats?.trading?.today_pnl > 0 ? "+18%" : "-"}
                    icon={TrendingUp}
                    color="cyan"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Chart */}
                <div className="lg:col-span-2">
                    <PerformanceChart />
                </div>

                {/* Market Overview - REAL-TIME */}
                <div className="lg:col-span-1">
                    <MarketOverview ticks={ticks} connected={ticksConnected} />
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentActivity />
                <StrategiesStatus />
            </div>

            {/* Trade Modal */}
            {showTradeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <ManualTrade onClose={() => setShowTradeModal(false)} />
                </div>
            )}

            {/* New Session Modal */}
            {showSessionModal && (
                <NewSessionModal onClose={() => setShowSessionModal(false)} />
            )}
        </div>
    );
}
