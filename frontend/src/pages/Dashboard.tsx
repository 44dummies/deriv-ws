/**
 * TraderMind Premium Dashboard
 * Figma-worthy, ultra-modern trading dashboard
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useDerivBalance } from '../hooks/useDerivBalance';
import {
    Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
    Activity, ChevronDown, ChevronRight, Zap, Target, Play, BarChart3,
    Sparkles, CircleDot, RefreshCw, Eye, EyeOff,
    MoreHorizontal, Download, Shield,
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
            const res = await fetch(`${baseUrl}/api/v1/stats/summary`);
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 30000,
        refetchInterval: 30000
    });
};

// Counter animation function available for future use

// =============================================================================
// GLASSMORPHISM COMPONENTS
// =============================================================================

function GlassCard({ children, className, gradient, hover = true }: {
    children: React.ReactNode;
    className?: string;
    gradient?: string;
    hover?: boolean;
}) {
    const hoverAnimation = hover ? { scale: 1.01, y: -2 } : {};
    return (
        <motion.div
            whileHover={hoverAnimation}
            transition={{ duration: 0.2 }}
            className={cn(
                "relative rounded-2xl overflow-hidden",
                "bg-gray-900/40 backdrop-blur-xl border border-white/10",
                "shadow-xl shadow-black/10",
                hover && "hover:border-white/20 hover:shadow-2xl hover:shadow-black/20 transition-all duration-300",
                className
            )}
        >
            {gradient && (
                <div className={cn("absolute inset-0 opacity-50", gradient)} />
            )}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}

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

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue', large }: StatCardProps) {
    const colorStyles = {
        blue: { bg: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20', icon: 'bg-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
        emerald: { bg: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20', icon: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
        purple: { bg: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/20', icon: 'bg-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
        orange: { bg: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/20', icon: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
        cyan: { bg: 'from-cyan-500/20 to-cyan-600/5', border: 'border-cyan-500/20', icon: 'bg-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
        pink: { bg: 'from-pink-500/20 to-pink-600/5', border: 'border-pink-500/20', icon: 'bg-pink-500', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
    };

    const styles = colorStyles[color];

    return (
        <GlassCard className={cn("p-5", styles.border)}>
            <div className="flex items-start justify-between">
                <div className={cn(
                    "p-3 rounded-xl shadow-lg",
                    styles.icon, styles.glow
                )}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                        trend === 'up' && "bg-emerald-500/20 text-emerald-400",
                        trend === 'down' && "bg-red-500/20 text-red-400",
                        trend === 'neutral' && "bg-gray-500/20 text-gray-400"
                    )}>
                        {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                        {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                        {trendValue}
                    </div>
                )}
            </div>

            <div className="mt-4 space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
                <p className={cn(
                    "font-bold text-white tracking-tight",
                    large ? "text-4xl" : "text-2xl"
                )}>
                    {value}
                </p>
                {subtitle && (
                    <p className="text-xs text-gray-500">{subtitle}</p>
                )}
            </div>
        </GlassCard>
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
        <GlassCard 
            className="relative overflow-hidden border-0"
            gradient="bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-pink-600/5"
        >
            {/* Animated orbs */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/30 rounded-full blur-[80px] animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Balance Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                                <Wallet className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 font-medium">Portfolio Balance</p>
                                <div className="flex items-center gap-3">
                                    <motion.span
                                        key={showBalance ? 'visible' : 'hidden'}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-5xl font-bold text-white tracking-tight"
                                    >
                                        {showBalance 
                                            ? balance.toLocaleString(undefined, { style: 'currency', currency })
                                            : '••••••'
                                        }
                                    </motion.span>
                                    <button
                                        onClick={() => setShowBalance(!showBalance)}
                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        {showBalance ? (
                                            <EyeOff className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <Eye className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-bold text-emerald-400">+24.5%</span>
                                <span className="text-xs text-emerald-400/60">this week</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <Shield className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-blue-400">RiskGuard Active</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <Zap className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-purple-400">10 Strategies</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Account Switcher */}
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                                className={cn(
                                    "flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-300",
                                    "bg-white/5 backdrop-blur-sm hover:bg-white/10",
                                    isReal
                                        ? "border-emerald-500/50 hover:border-emerald-400"
                                        : "border-orange-500/50 hover:border-orange-400"
                                )}
                            >
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    isReal ? "bg-emerald-500/20" : "bg-orange-500/20"
                                )}>
                                    <CircleDot className={cn(
                                        "w-5 h-5",
                                        isReal ? "text-emerald-400" : "text-orange-400"
                                    )} />
                                </div>
                                <div className="text-left">
                                    <div className={cn(
                                        "text-lg font-bold",
                                        isReal ? "text-emerald-400" : "text-orange-400"
                                    )}>
                                        {isReal ? 'REAL ACCOUNT' : 'DEMO ACCOUNT'}
                                    </div>
                                    <div className="text-xs text-gray-500">{activeAccount?.loginid}</div>
                                </div>
                                <ChevronDown className={cn(
                                    "w-5 h-5 text-gray-400 transition-transform",
                                    isAccountMenuOpen && "rotate-180"
                                )} />
                            </button>

                            <AnimatePresence>
                                {isAccountMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-80 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                                    >
                                        <div className="p-2">
                                            {user?.deriv_accounts?.map((acc, idx) => (
                                                <motion.button
                                                    key={acc.loginid}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => {
                                                        switchAccount(acc.loginid);
                                                        setIsAccountMenuOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-4 rounded-xl transition-all",
                                                        acc.loginid === activeAccount?.loginid
                                                            ? "bg-white/10"
                                                            : "hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-3 h-3 rounded-full",
                                                            !acc.is_virtual ? "bg-emerald-500" : "bg-orange-500"
                                                        )} />
                                                        <div className="text-left">
                                                            <div className="font-semibold text-white">
                                                                {!acc.is_virtual ? 'Real' : 'Demo'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{acc.loginid}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-mono font-bold text-white">
                                                            {acc.balance?.toLocaleString() || '0'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{acc.currency}</div>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

function QuickActions({ onTrade }: { onTrade: () => void }) {
    const actions = [
        { icon: Play, label: 'Quick Trade', color: 'from-blue-500 to-cyan-500', onClick: onTrade },
        { icon: Target, label: 'New Session', color: 'from-purple-500 to-pink-500', onClick: () => {} },
        { icon: BarChart3, label: 'Analytics', color: 'from-emerald-500 to-teal-500', onClick: () => {} },
        { icon: Download, label: 'Export', color: 'from-orange-500 to-amber-500', onClick: () => {} },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, i) => (
                <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={action.onClick}
                    className={cn(
                        "group relative flex items-center gap-3 p-4 rounded-2xl overflow-hidden",
                        "bg-gray-900/40 backdrop-blur-xl border border-white/10",
                        "hover:border-white/20 transition-all duration-300"
                    )}
                >
                    {/* Gradient background on hover */}
                    <div className={cn(
                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                        `bg-gradient-to-r ${action.color}`
                    )} style={{ opacity: 0.1 }} />

                    <div className={cn(
                        "p-3 rounded-xl bg-gradient-to-br shadow-lg",
                        action.color
                    )}>
                        <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-white">{action.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 ml-auto group-hover:translate-x-1 transition-transform" />
                </motion.button>
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
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Performance</h3>
                    <p className="text-sm text-gray-500">P&L over time</p>
                </div>
                <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5">
                    {ranges.map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                timeRange === range
                                    ? "bg-blue-500 text-white"
                                    : "text-gray-400 hover:text-white"
                            )}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#6B7280" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis 
                            stroke="#6B7280" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                            }}
                            labelStyle={{ color: '#9CA3AF' }}
                            itemStyle={{ color: '#fff' }}
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
        </GlassCard>
    );
}

// =============================================================================
// MARKET OVERVIEW
// =============================================================================

function MarketOverview() {
    const markets = [
        { symbol: 'R_100', name: 'Volatility 100', change: 2.4, price: 1234.56, trend: 'up' },
        { symbol: 'R_50', name: 'Volatility 50', change: -1.2, price: 567.89, trend: 'down' },
        { symbol: 'JD_100', name: 'Jump 100', change: 5.7, price: 890.12, trend: 'up' },
        { symbol: 'R_25', name: 'Volatility 25', change: 0.8, price: 345.67, trend: 'up' },
    ];

    return (
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Markets</h3>
                    <p className="text-sm text-gray-500">Jump & Volatility indices</p>
                </div>
                <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3">
                {markets.map((market) => (
                    <div
                        key={market.symbol}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold",
                                market.symbol.startsWith('JD') 
                                    ? "bg-purple-500/20 text-purple-400"
                                    : "bg-blue-500/20 text-blue-400"
                            )}>
                                {market.symbol.substring(0, 2)}
                            </div>
                            <div>
                                <div className="font-medium text-white">{market.name}</div>
                                <div className="text-xs text-gray-500">{market.symbol}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono font-medium text-white">${market.price.toFixed(2)}</div>
                            <div className={cn(
                                "text-xs font-medium flex items-center gap-1 justify-end",
                                market.change > 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                                {market.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {market.change > 0 ? '+' : ''}{market.change}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </GlassCard>
    );
}

// =============================================================================
// RECENT ACTIVITY
// =============================================================================

function RecentActivity() {
    const activities = [
        { type: 'trade', action: 'CALL executed', market: 'R_100', result: 'win', amount: '+$45.00', time: '2m ago' },
        { type: 'trade', action: 'PUT executed', market: 'JD_50', result: 'loss', amount: '-$20.00', time: '15m ago' },
        { type: 'session', action: 'Session started', market: 'R_50', result: 'active', amount: '', time: '1h ago' },
        { type: 'trade', action: 'CALL executed', market: 'R_25', result: 'win', amount: '+$32.00', time: '2h ago' },
    ];

    return (
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                    <p className="text-sm text-gray-500">Latest trades & sessions</p>
                </div>
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="space-y-3">
                {activities.map((activity, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                activity.result === 'win' && "bg-emerald-500/20",
                                activity.result === 'loss' && "bg-red-500/20",
                                activity.result === 'active' && "bg-blue-500/20"
                            )}>
                                {activity.result === 'win' && <ArrowUpRight className="w-5 h-5 text-emerald-400" />}
                                {activity.result === 'loss' && <ArrowDownRight className="w-5 h-5 text-red-400" />}
                                {activity.result === 'active' && <Activity className="w-5 h-5 text-blue-400" />}
                            </div>
                            <div>
                                <div className="font-medium text-white text-sm">{activity.action}</div>
                                <div className="text-xs text-gray-500">{activity.market}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={cn(
                                "font-mono font-medium text-sm",
                                activity.result === 'win' && "text-emerald-400",
                                activity.result === 'loss' && "text-red-400",
                                activity.result === 'active' && "text-blue-400"
                            )}>
                                {activity.amount || 'Active'}
                            </div>
                            <div className="text-xs text-gray-500">{activity.time}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <button className="w-full mt-4 py-3 text-sm text-gray-400 hover:text-white border border-white/10 rounded-xl hover:bg-white/5 transition-all">
                View All Activity
            </button>
        </GlassCard>
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
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Quant Strategies</h3>
                    <p className="text-sm text-gray-500">Active trading algorithms</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">10 Active</span>
                </div>
            </div>

            <div className="space-y-3">
                {strategies.map((strategy) => (
                    <div key={strategy.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                strategy.status === 'active' ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                            )} />
                            <span className="text-sm font-medium text-white">{strategy.name}</span>
                            {strategy.status === 'learning' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase">
                                    Learning
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-gray-500">Signals</div>
                                <div className="text-sm font-medium text-white">{strategy.signals}</div>
                            </div>
                            <div className="w-16 text-right">
                                <div className="text-xs text-gray-500">Win Rate</div>
                                <div className={cn(
                                    "text-sm font-bold",
                                    strategy.winRate >= 75 ? "text-emerald-400" : 
                                    strategy.winRate >= 65 ? "text-blue-400" : "text-orange-400"
                                )}>
                                    {strategy.winRate}%
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </GlassCard>
    );
}

// =============================================================================
// MAIN DASHBOARD EXPORT
// =============================================================================

export default function Dashboard() {
    const { data: stats, isLoading, refetch } = useRealStats();
    const [showTradeModal, setShowTradeModal] = useState(false);
    useDerivBalance();

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-yellow-400" />
                        Command Center
                    </h1>
                    <p className="text-gray-500 mt-1">Real-time trading intelligence at your fingertips</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        <span className="text-sm font-medium">Refresh</span>
                    </button>
                    <button
                        onClick={() => setShowTradeModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-105"
                    >
                        <Zap className="w-4 h-4" />
                        Quick Trade
                    </button>
                </div>
            </motion.div>

            {/* Balance Hero */}
            <BalanceHeroCard />

            {/* Quick Actions */}
            <QuickActions onTrade={() => setShowTradeModal(true)} />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Trades"
                    value={stats?.trading?.total_trades || 142}
                    trend="up"
                    trendValue="+12%"
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    title="Win Rate"
                    value={`${stats?.trading?.win_rate || 68}%`}
                    trend="up"
                    trendValue="+5.2%"
                    icon={Target}
                    color="emerald"
                />
                <StatCard
                    title="Active Sessions"
                    value={stats?.sessions?.active || 3}
                    subtitle="2 automated"
                    icon={Zap}
                    color="purple"
                />
                <StatCard
                    title="Today's P&L"
                    value="+$487.50"
                    trend="up"
                    trendValue="+18%"
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

                {/* Market Overview */}
                <div className="lg:col-span-1">
                    <MarketOverview />
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentActivity />
                <StrategiesStatus />
            </div>

            {/* Trade Modal */}
            <AnimatePresence>
                {showTradeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={(e) => e.target === e.currentTarget && setShowTradeModal(false)}
                    >
                        <ManualTrade onClose={() => setShowTradeModal(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
