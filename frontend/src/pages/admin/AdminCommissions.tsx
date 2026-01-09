import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Download } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { motion } from 'framer-motion';

interface CommissionData {
    total_earned: number;
    pending_payout: number;
    currency: string;
    breakdown: { source: string; amount: number }[];
}

export default function AdminCommissions() {
    const [filter, setFilter] = useState<'today' | 'month'>('today');
    const [data, setData] = useState<CommissionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEarnings = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/v1/stats/commissions?filter=${filter}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch {
                // Failed to fetch commissions - handled silently
            } finally {
                setLoading(false);
            }
        };

        fetchEarnings();
    }, [filter]);

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="h-8 w-8 text-success" />
                        Commission & Revenue
                    </h1>
                    <p className="text-slate-400 mt-1">Track 3% earnings from Deriv partnership trades.</p>
                </div>

                <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                    <button
                        onClick={() => setFilter('today')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'today' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setFilter('month')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'month' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        This Month
                    </button>
                </div>
            </header>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <DollarSign className="h-32 w-32" />
                    </div>
                    <div className="text-sm text-slate-400 uppercase tracking-wider mb-2">Total Earned ({filter})</div>
                    <div className="text-5xl font-bold text-success-glow font-mono">
                        {loading ? '...' : `$${data?.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-success text-sm bg-success/10 w-fit px-3 py-1 rounded-full border border-success/20">
                        <TrendingUp className="h-4 w-4" />
                        <span>Target on track</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-8">
                    <div className="text-sm text-slate-400 uppercase tracking-wider mb-2">Pending Payout</div>
                    <div className="text-5xl font-bold text-white font-mono">
                        {loading ? '...' : `$${data?.pending_payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </div>
                    <div className="mt-4 text-slate-500 text-sm">
                        Payouts processed every Monday.
                    </div>
                </GlassCard>
            </div>

            {/* Breakdown Chart (Visual) */}
            <GlassCard className="p-6">
                <h3 className="font-bold text-lg mb-6">Revenue Sources</h3>
                <div className="space-y-4">
                    {data?.breakdown.map((item, i) => (
                        <div key={item.source}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-300">{item.source}</span>
                                <span className="font-mono text-white">${item.amount.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(item.amount / (data?.total_earned || 1)) * 100}%` }}
                                    className={`h-full ${i === 0 ? 'bg-primary' : 'bg-purple-500'}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <button className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors mx-auto">
                <Download className="h-4 w-4" /> Export Report (CSV)
            </button>
        </div>
    );
}
