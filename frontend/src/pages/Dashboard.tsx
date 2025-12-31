import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useDerivBalance } from '../hooks/useDerivBalance';
import { Wallet, TrendingUp, ArrowUpRight, Activity, ChevronDown, Monitor, Shield } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// Fetch real stats from backend instead of mock data
const useRealStats = () => {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const url = `${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4000'}/api/v1/stats/summary`;
            const res = await fetch(url);
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 30000, // Refresh every 30s
        refetchInterval: 30000
    });
};

export default function Dashboard() {
    const { user, switchAccount } = useAuthStore();
    useDerivBalance(); // Activate real-time balance subscription
    const { data: stats } = useRealStats(); // Fetch real dashboard stats

    const activeAccount = user?.deriv_accounts.find(a => a.loginid === user?.active_account_id) || user?.deriv_accounts[0];
    const isReal = !activeAccount?.is_virtual;
    const balance = activeAccount?.balance || 0;
    const currency = activeAccount?.currency || 'USD';

    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Overview
                    </h1>
                    <p className="text-gray-400">Welcome back, <span className="text-white font-medium">{user?.email || 'Trader'}</span></p>
                </div>

                <div className="flex items-center gap-3 relative">
                    {/* Account Switcher */}
                    <div className="relative">
                        <button
                            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                            className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 ${isReal
                                ? 'bg-success/5 border-success/20 hover:bg-success/10 text-success shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                : 'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
                            <span className="font-bold tracking-wide">{isReal ? 'REAL ACCOUNT' : 'DEMO ACCOUNT'}</span>
                            <span className="opacity-50 text-xs">({activeAccount?.loginid})</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown */}
                        {isAccountMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                <div className="p-2 space-y-1">
                                    {user?.deriv_accounts.map(acc => (
                                        <button
                                            key={acc.loginid}
                                            onClick={() => {
                                                switchAccount(acc.loginid);
                                                setIsAccountMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${acc.loginid === activeAccount?.loginid
                                                ? 'bg-white/10 text-white'
                                                : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${!acc.is_virtual ? 'bg-success' : 'bg-orange-500'}`} />
                                                <div className="text-left">
                                                    <div className="font-bold text-xs">{!acc.is_virtual ? 'Real' : 'Demo'}</div>
                                                    <div className="text-[10px] opacity-50">{acc.loginid}</div>
                                                </div>
                                            </div>
                                            <div className="text-xs font-mono opacity-80">
                                                {acc.currency}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="p-3 rounded-xl bg-surface border border-white/5 hover:bg-white/10 transition-colors shadow-lg">
                        <Activity className="w-5 h-5 text-primary" />
                    </button>
                </div>
            </header>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card - Premium Effect */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="group relative overflow-hidden glass-panel p-8 rounded-3xl border-t border-t-white/10"
                >
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-500" />

                    <div className="flex items-start justify-between mb-8 relative z-10">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-110 transition-transform duration-300">
                            <Wallet className="w-6 h-6" />
                        </div>
                        {stats?.trading?.win_rate > 0 && (
                            <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold border border-success/10 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                <ArrowUpRight className="w-3 h-3" /> {stats.trading.win_rate}%
                            </span>
                        )}
                    </div>

                    <div className="relative z-10">
                        <div className="text-sm text-gray-400 font-medium tracking-widest uppercase mb-1">Total Balance</div>
                        <div className="text-5xl font-bold text-white tracking-tighter text-glow">
                            {balance.toLocaleString(undefined, { style: 'currency', currency: currency })}
                        </div>
                        <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Protected by RiskGuard™
                        </div>
                    </div>
                </motion.div>

                {/* 7-Day Profit */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel p-8 rounded-3xl group hovered:border-success/30 transition-colors"
                >
                    <div className="flex items-start justify-between mb-8">
                        <div className="p-3 rounded-2xl bg-success/10 text-success ring-1 ring-success/20">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-400 font-medium tracking-widest uppercase mb-1">Total Profit</div>
                    <div className="text-4xl font-bold text-success tracking-tight">
                        ${(stats?.trading?.total_profit || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 mt-2 font-medium">
                        {stats?.trading?.total_trades || 0} trades executed
                    </div>
                </motion.div>

                {/* Active Bots */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-8 rounded-3xl"
                >
                    <div className="flex items-start justify-between mb-8">
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20">
                            <Monitor className="w-6 h-6" />
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    </div>
                    <div className="text-sm text-gray-400 font-medium tracking-widest uppercase mb-1">Active Sessions</div>
                    <div className="text-4xl font-bold text-white tracking-tight">
                        {stats?.sessions?.active || 0}
                    </div>
                    <div className="text-sm text-gray-500 mt-2 font-medium">
                        {stats?.users?.active || 0} users online
                    </div>
                </motion.div>
            </div>

            {/* P&L Chart */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-panel p-8 rounded-3xl h-[450px] border border-white/5 relative overflow-hidden"
            >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div>
                        <h3 className="font-bold text-xl">Performance Analytics</h3>
                        <p className="text-sm text-gray-500">Net profit accumulation over time</p>
                    </div>
                    <select className="bg-surface/50 text-sm text-gray-300 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 transition-colors">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                    </select>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    {/* Chart will be populated when historical data API is available */}
                    <AreaChart data={[{ name: 'Now', profit: stats?.trading?.total_profit || 0 }]}>
                        <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary-glow)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-primary-glow)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#6b7280"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#6b7280"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                            dx={-10}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ stroke: 'var(--color-primary-glow)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="profit"
                            stroke="var(--color-primary-glow)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorProfit)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary-glow)' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </motion.div>
        </div>
    );
}
