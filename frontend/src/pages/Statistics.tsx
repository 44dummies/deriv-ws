
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, TrendingUp, Target, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';

// Placeholder: Historical data API not yet implemented
// This will be fetched from /api/v1/stats/history when available
const getChartData = (stats: any) => {
    if (!stats?.trading) return [];
    // Generate single-point data from current stats until historical API exists
    return [
        { day: 'Today', trades: stats.trading.total_trades, winRate: stats.trading.win_rate }
    ];
};

export default function Statistics() {
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['stats'],
        queryFn: async () => {
            const url = `${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4000'}/api/v1/stats/summary`;
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

            {/* Compact Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* 1. KPI Cards (Taking 1 col each) - Compact Height */}
                <GlassCard className="flex flex-col justify-between h-28 p-4">
                    <div className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Total Profit</div>
                    <div>
                        <div className="text-2xl font-bold text-white tracking-tight text-glow">
                            ${stats?.trading?.total_profit?.toLocaleString() || '0.00'}
                        </div>
                        <div className="text-[10px] text-success flex items-center gap-1 mt-1 font-medium">
                            <TrendingUp className="w-3 h-3" /> +12.5%
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="flex flex-col justify-between h-28 p-4">
                    <div className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Trades</div>
                    <div>
                        <div className="text-2xl font-bold text-white tracking-tight">{stats?.trading?.total_trades || 0}</div>
                        <div className="text-[10px] text-blue-400 mt-1 font-medium">Total Executed</div>
                    </div>
                </GlassCard>

                <GlassCard className="flex flex-col justify-between h-28 p-4">
                    <div className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Signals</div>
                    <div>
                        <div className="text-2xl font-bold text-white tracking-tight">{stats?.trading?.total_signals || 0}</div>
                        <div className="text-[10px] text-purple-400 mt-1 font-medium">AI Generated</div>
                    </div>
                </GlassCard>

                <GlassCard className="flex flex-col justify-between h-28 p-4">
                    <div className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">Win Rate</div>
                    <div>
                        <div className="text-2xl font-bold text-white tracking-tight">{stats?.trading?.win_rate || 0}%</div>
                        <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
                            <div className="bg-gradient-to-r from-primary to-success h-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: `${stats?.trading?.win_rate || 0}%` }} />
                        </div>
                    </div>
                </GlassCard>

                {/* 2. Win Rate Chart (Spanning 2 Cols) */}
                <GlassCard className="md:col-span-2 h-60 p-5">
                    <h3 className="text-xs font-bold text-gray-300 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Target className="w-3 h-3 text-primary" />
                        Performance Trend
                    </h3>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getChartData(stats)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="day" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        backdropFilter: 'blur(8px)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                    }}
                                />
                                <Bar
                                    dataKey="winRate"
                                    fill="url(#colorGradient)"
                                    radius={[2, 2, 0, 0]}
                                    barSize={24}
                                />
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1} />
                                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* 3. AI Insights (Spanning 2 Cols) */}
                <GlassCard className="md:col-span-2 h-60 overflow-y-auto p-5">
                    <div className="flex items-center gap-3 mb-4 sticky top-0 bg-[#0B1121]/0 backdrop-blur-sm z-10 pb-2 border-b border-white/5">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary ring-1 ring-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                            <Brain className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Neural Engine</h3>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-[10px] text-gray-500 font-mono">v{stats?.ai?.model_version || '2.0.4'} • ONLINE</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {stats?.ai?.insights?.map((insight: string, idx: number) => (
                            <div key={idx} className="flex gap-3 text-xs text-gray-400 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                                <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0 shadow-[0_0_5px_var(--color-primary)]" />
                                {insight}
                            </div>
                        )) || (
                                <div className="text-xs text-gray-500 italic p-4 text-center border border-dashed border-white/10 rounded-xl">
                                    Muzan AI evaluating market conditions...
                                </div>
                            )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
