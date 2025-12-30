import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { Wallet, TrendingUp, ArrowUpRight, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
    { name: 'Mon', profit: 400 },
    { name: 'Tue', profit: 300 },
    { name: 'Wed', profit: 600 },
    { name: 'Thu', profit: 400 },
    { name: 'Fri', profit: 700 },
    { name: 'Sat', profit: 800 },
    { name: 'Sun', profit: 950 },
];

export default function Dashboard() {
    const { user } = useAuthStore();
    const isReal = !user?.deriv_account?.is_virtual;
    const balance = user?.deriv_account?.balance || 0;
    const currency = user?.deriv_account?.currency || 'USD';

    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Overview</h1>
                    <p className="text-gray-400">Welcome back, {user?.email || 'Trader'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isReal ? 'bg-success/10 text-success' : 'bg-orange-500/10 text-orange-500'}`}>
                        {isReal ? 'REAL ACCOUNT' : 'DEMO ACCOUNT'}
                    </span>
                    <button className="p-2 rounded-lg bg-surface border border-white/5 hover:bg-white/5 transition-colors">
                        <Activity className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </header>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-surface border-primary/20"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-primary-glow font-bold flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> +12.5%
                        </span>
                    </div>
                    <div className="text-sm text-gray-400 uppercase font-mono tracking-wider">Total Balance</div>
                    <div className="text-4xl font-bold mt-1 text-white">
                        {balance.toLocaleString(undefined, { style: 'currency', currency: currency })}
                    </div>
                </motion.div>

                {/* 7-Day Profit */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel p-6 rounded-2xl"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-success/20 text-success">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-400 uppercase font-mono tracking-wider">7-Day Profit</div>
                    <div className="text-3xl font-bold mt-1 text-success">+$550.00</div>
                    <div className="text-xs text-gray-500 mt-2">vs. previous week</div>
                </motion.div>

                {/* Active Bots */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-6 rounded-2xl"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-sm text-gray-400 uppercase font-mono tracking-wider">Active Bots</div>
                    <div className="text-3xl font-bold mt-1">3 / 5</div>
                    <div className="text-xs text-gray-500 mt-2">System load: 12%</div>
                </motion.div>
            </div>

            {/* P&L Chart */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-panel p-6 rounded-2xl h-[400px]"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Performance Analytics</h3>
                    <select className="bg-transparent text-sm text-gray-400 border border-white/10 rounded-lg p-1 outline-none">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                    </select>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockData}>
                        <defs>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary-glow)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-primary-glow)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="profit"
                            stroke="var(--color-primary-glow)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorProfit)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </motion.div>
        </div>
    );
}
