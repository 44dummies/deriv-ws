
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, TrendingUp, Zap, Target, Loader2 } from 'lucide-react';

const mockDailyStats = [
    { day: 'Mon', trades: 12, winRate: 65 },
    { day: 'Tue', trades: 15, winRate: 58 },
    { day: 'Wed', trades: 8, winRate: 85 },
    { day: 'Thu', trades: 20, winRate: 45 },
    { day: 'Fri', trades: 18, winRate: 72 },
];

export default function Statistics() {
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['stats'],
        queryFn: async () => {
            const url = `${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4000'}/api/v1/stats`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        }
    });

    if (isLoading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (error) return (
        <div className="p-4 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
            Failed to load statistics. Please ensure the backend is running.
        </div>
    );

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold mb-2">Performance Reports</h1>
                <p className="text-gray-400 max-w-2xl">
                    Detailed analysis of your trading bot's performance.
                </p>
            </header>

            {/* AI Insights - Real Data Connected */}
            <div className="glass-panel p-8 rounded-3xl border border-primary/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 bg-primary/20 rounded-xl text-primary animate-pulse-slow">
                        <Brain className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-2">
                            {stats?.ai?.model_version ? `Model: ${stats.ai.model_version}` : 'AI Analysis Module'}
                        </h2>
                        <div className="text-gray-300 leading-relaxed space-y-2">
                            {stats?.ai?.insights?.map((insight: string, idx: number) => (
                                <p key={idx} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    {insight}
                                </p>
                            )) || 'Waiting for sufficient data to generate insights...'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Win Rate Chart - Keeping Mock for Visuals until DB has history */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <Target className="w-5 h-5 text-accent" />
                        Adjusted Win Rate
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockDailyStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="winRate" fill="var(--color-primary-glow)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* KPI Grid - Real Data Connected */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                        <div className="text-gray-400 text-sm uppercase">Total Profit</div>
                        <div className="text-3xl font-bold text-success mt-2">
                            ${stats?.trading?.total_profit?.toLocaleString() || '0.00'}
                        </div>
                        <TrendingUp className="w-6 h-6 text-success/50 ml-auto mt-4" />
                    </div>
                    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                        <div className="text-gray-400 text-sm uppercase">Total Trades</div>
                        <div className="text-3xl font-bold mt-2">{stats?.trading?.total_trades || 0}</div>
                        <Zap className="w-6 h-6 text-yellow-500/50 ml-auto mt-4" />
                    </div>
                    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between col-span-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-gray-400 text-sm uppercase">Active Signals</div>
                                <div className="text-3xl font-bold mt-2">{stats?.trading?.total_signals || 0}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 text-sm uppercase">Win Rate</div>
                                <div className="text-3xl font-bold mt-2 text-primary">{stats?.trading?.win_rate || 0}%</div>
                            </div>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-primary to-success h-full transition-all duration-1000"
                                style={{ width: `${stats?.trading?.win_rate || 0}%` }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-2 text-center">Based on last 30 days</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
