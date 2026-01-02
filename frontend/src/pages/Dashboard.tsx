import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useDerivBalance } from '../hooks/useDerivBalance';
import { 
    Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Activity, 
    ChevronDown, Monitor, Shield, Zap, Clock, Target, BarChart3, 
    Sparkles, CircleDot, Brain, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../lib/utils';

// Fetch real stats from backend
const useRealStats = () => {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const url = \`\${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4000'}/api/v1/stats/summary\`;
            const res = await fetch(url);
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 30000,
        refetchInterval: 30000
    });
};

// Live pulse indicator
function LivePulse({ active = true }: { active?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
                <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    active ? "bg-emerald-400" : "bg-gray-500"
                )} />
                <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    active ? "bg-emerald-500" : "bg-gray-600"
                )} />
            </span>
            <span className={cn(
                "text-xs font-medium uppercase tracking-wider",
                active ? "text-emerald-400" : "text-gray-500"
            )}>
                {active ? 'Live' : 'Offline'}
            </span>
        </div>
    );
}

// Metric card component
function MetricCard({ 
    title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary', delay = 0 
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'primary' | 'success' | 'warning' | 'purple' | 'cyan';
    delay?: number;
}) {
    const colorMap = {
        primary: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
        success: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
        warning: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400',
        purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
        cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
                "relative group overflow-hidden rounded-2xl p-6",
                "bg-gradient-to-br border backdrop-blur-xl",
                "hover:scale-[1.02] transition-transform duration-300",
                colorMap[color]
            )}
        >
            {/* Glow effect */}
            <div className={cn(
                "absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity",
                color === 'primary' && "bg-blue-500",
                color === 'success' && "bg-emerald-500",
                color === 'warning' && "bg-orange-500",
                color === 'purple' && "bg-purple-500",
                color === 'cyan' && "bg-cyan-500"
            )} />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                        "p-3 rounded-xl bg-white/5 ring-1 ring-white/10",
                        "group-hover:scale-110 transition-transform duration-300"
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
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

                <div className="space-y-1">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">{title}</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
            </div>
        </motion.div>
    );
}

// Quick action button component
function QuickAction({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
    const colorClasses: Record<string, string> = {
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20',
        cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
    };

    return (
        <button className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl",
            "bg-gradient-to-r border transition-all duration-200",
            "hover:scale-105 active:scale-95",
            colorClasses[color] || colorClasses.blue
        )}>
            <Icon className="w-4 h-4" />
            <span className="font-medium text-sm">{label}</span>
        </button>
    );
}

export default function Dashboard() {
    const { user, switchAccount } = useAuthStore();
    useDerivBalance();
    const { data: stats, isLoading, refetch } = useRealStats();
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

    const activeAccount = user?.deriv_accounts.find(a => a.loginid === user?.active_account_id) || user?.deriv_accounts[0];
    const isReal = !activeAccount?.is_virtual;
    const balance = activeAccount?.balance || 0;
    const currency = activeAccount?.currency || 'USD';

    // Mock performance data (replace with real API data)
    const performanceData = [
        { name: 'Mon', profit: 120, trades: 8 },
        { name: 'Tue', profit: 85, trades: 12 },
        { name: 'Wed', profit: -45, trades: 5 },
        { name: 'Thu', profit: 210, trades: 15 },
        { name: 'Fri', profit: 175, trades: 11 },
        { name: 'Sat', profit: 95, trades: 6 },
        { name: 'Sun', profit: 140, trades: 9 },
    ];

    return (
        <div className="space-y-8 pb-8">
            {/* Header Section */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
                                Command Center
                            </span>
                        </h1>
                    </motion.div>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        Welcome back, <span className="text-white font-medium">{user?.email?.split('@')[0] || 'Trader'}</span>
                    </motion.p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <LivePulse active={!!stats} />

                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className={cn(
                            "p-2.5 rounded-xl border border-white/10 bg-white/5",
                            "hover:bg-white/10 transition-all duration-200",
                            isLoading && "animate-spin"
                        )}
                    >
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>

                    {/* Account Switcher */}
                    <div className="relative">
                        <button
                            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300",
                                isReal
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                    : "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                            )}
                        >
                            <CircleDot className="w-4 h-4" />
                            <span className="font-bold text-sm tracking-wide">{isReal ? 'REAL' : 'DEMO'}</span>
                            <span className="text-xs opacity-60">{activeAccount?.loginid}</span>
                            <ChevronDown className={cn(
                                "w-4 h-4 transition-transform duration-200",
                                isAccountMenuOpen && "rotate-180"
                            )} />
                        </button>

                        <AnimatePresence>
                            {isAccountMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                                >
                                    <div className="p-2 space-y-1">
                                        {user?.deriv_accounts.map((acc, idx) => (
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
                                                    "w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200",
                                                    acc.loginid === activeAccount?.loginid
                                                        ? "bg-white/10 text-white"
                                                        : "hover:bg-white/5 text-gray-400 hover:text-white"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "w-2.5 h-2.5 rounded-full",
                                                        !acc.is_virtual ? "bg-emerald-500" : "bg-orange-500"
                                                    )} />
                                                    <div className="text-left">
                                                        <div className="font-semibold text-sm">
                                                            {!acc.is_virtual ? 'Real Account' : 'Demo Account'}
                                                        </div>
                                                        <div className="text-xs opacity-50">{acc.loginid}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono text-sm font-bold">
                                                        {acc.balance?.toLocaleString() || '0'}
                                                    </div>
                                                    <div className="text-xs opacity-50">{acc.currency}</div>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </header>

            {/* Hero Balance Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-white/10 p-8"
            >
                {/* Animated background */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" />
                    <div className="absolute bottom-0 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-white/10">
                                <Wallet className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 uppercase tracking-widest font-medium">Portfolio Value</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl lg:text-6xl font-bold text-white tracking-tighter">
                                        {balance.toLocaleString(undefined, { style: 'currency', currency })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                <TrendingUp className="w-4 h-4" />
                                <span className="font-bold">+{stats?.trading?.win_rate || 0}%</span>
                                <span className="text-emerald-300/60">win rate</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <Shield className="w-4 h-4 text-blue-400" />
                                <span>RiskGuard™ Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <QuickAction icon={Zap} label="Quick Trade" color="blue" />
                        <QuickAction icon={Target} label="Auto Pilot" color="purple" />
                        <QuickAction icon={BarChart3} label="Analytics" color="cyan" />
                    </div>
                </div>
            </motion.div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Profit"
                    value={\`\$\${(stats?.trading?.total_profit || 0).toLocaleString()}\`}
                    subtitle={\`\${stats?.trading?.total_trades || 0} total trades\`}
                    icon={TrendingUp}
                    trend="up"
                    trendValue="+12.5%"
                    color="success"
                    delay={0.15}
                />
                <MetricCard
                    title="Active Sessions"
                    value={stats?.sessions?.active || 0}
                    subtitle={\`\${stats?.users?.active || 0} traders online\`}
                    icon={Monitor}
                    color="purple"
                    delay={0.2}
                />
                <MetricCard
                    title="Avg Trade Duration"
                    value="4.2m"
                    subtitle="Last 50 trades"
                    icon={Clock}
                    color="cyan"
                    delay={0.25}
                />
                <MetricCard
                    title="AI Confidence"
                    value="87%"
                    subtitle="Model accuracy score"
                    icon={Brain}
                    trend="up"
                    trendValue="+2.3%"
                    color="primary"
                    delay={0.3}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="lg:col-span-2 rounded-2xl bg-gray-900/50 border border-white/5 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-white">Performance Overview</h3>
                            <p className="text-sm text-gray-500">Profit & loss over time</p>
                        </div>
                        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
                            {['24h', '7d', '30d', '90d'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setSelectedTimeRange(range)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                        selectedTimeRange === range
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
                            <AreaChart data={performanceData}>
                                <defs>
                                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => \`\$\${v}\`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    fill="url(#profitGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Trade Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-2xl bg-gray-900/50 border border-white/5 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-white">Trade Activity</h3>
                            <p className="text-sm text-gray-500">Trades per day</p>
                        </div>
                        <Activity className="w-5 h-5 text-gray-500" />
                    </div>

                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px'
                                    }}
                                />
                                <Bar dataKey="trades" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
