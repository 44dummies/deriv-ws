import { useState, useEffect } from 'react';
import { DollarSign, Download } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';

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
                const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
                const res = await fetch(`${baseUrl}/api/v1/stats/commissions?filter=${filter}`, {
                    credentials: 'include'
                });
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
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-primary" />
                        Commission and revenue
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Track partner earnings from executed trades.</p>
                </div>

                <div className="flex bg-muted/40 rounded-md p-1 border border-border">
                    <button
                        onClick={() => setFilter('today')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'today' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setFilter('month')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'month' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        This Month
                    </button>
                </div>
            </header>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-8 relative overflow-hidden">
                    <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Total earned ({filter})</div>
                    <div className="text-4xl font-semibold">
                        {loading ? '...' : `$${data?.total_earned !== undefined ? data.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}`}
                    </div>
                </GlassCard>

                <GlassCard className="p-8">
                    <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Pending payout</div>
                    <div className="text-4xl font-semibold">
                        {loading ? '...' : `$${data?.pending_payout !== undefined ? data.pending_payout.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}`}
                    </div>
                    <div className="mt-4 text-muted-foreground text-sm">
                        Payouts processed every Monday.
                    </div>
                </GlassCard>
            </div>

            {/* Breakdown Chart (Visual) */}
            <GlassCard className="p-6">
                <h3 className="font-semibold text-sm mb-6">Revenue sources</h3>
                <div className="space-y-4">
                    {data?.breakdown.map((item, i) => (
                        <div key={item.source}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">{item.source}</span>
                                <span className="font-mono text-foreground">${item.amount.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${i === 0 ? 'bg-primary' : 'bg-border'}`}
                                    style={{ width: `${(item.amount / (data?.total_earned || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors mx-auto">
                <Download className="h-4 w-4" /> Export Report (CSV)
            </button>
        </div>
    );
}
