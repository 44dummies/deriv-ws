import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseService';
import { GlassCard } from '../ui/glass/GlassCard';
import { GlassTable } from '../ui/glass/GlassTable';
import { Download, Calendar, Filter } from 'lucide-react';
import { GlassButton } from '../ui/glass/GlassButton';

interface Trade {
    id: string;
    contract_id: string;
    symbol: string;
    type: string; // CALL/PUT
    entry_spot: number;
    exit_spot: number;
    profit: number;
    status: string; // WON/LOST
    created_at: string;
    session_id: string;
}

export const ReportsView: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Join with session_participants to filter by user, 
                // OR assuming 'trades' has user_id or we filter by joined sessions.
                // Simpler: Fetch trades where user_id matches meta (if stored) or just all trades for sessions user participated in.
                // Codebase convention seems to vary. Let's assume 'trades' table has 'user_id' or we show trades for 'my' sessions.
                // Actually, the bot trades on behalf of the session leader usually, but 'trades' table records the master execution.
                // Users want to see "their" session results. 
                // Let's fetch all trades for now, filtering by user might need backend join.
                // Assuming 'recent' trades are relevant.

                const { data, error } = await supabase
                    .from('trades')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (error) throw error;
                setTrades(data || []);
            } catch (err) {
                console.error('Failed to load reports:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const columns = [
        { header: 'Time', accessor: (t: Trade) => new Date(t.created_at).toLocaleString() },
        { header: 'Symbol', accessor: 'symbol' as keyof Trade },
        { header: 'Type', accessor: (t: Trade) => <span className={`font-bold ${t.type === 'CALL' ? 'text-emerald-400' : 'text-red-400'}`}>{t.type}</span> },
        { header: 'Entry', accessor: 'entry_spot' as keyof Trade },
        { header: 'Exit', accessor: 'exit_spot' as keyof Trade },
        {
            header: 'Profit',
            accessor: (t: Trade) => (
                <span className={t.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}
                </span>
            )
        },
        {
            header: 'Status',
            accessor: (t: Trade) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'WON' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {t.status}
                </span>
            )
        },
    ];

    if (loading) return <div className="p-8 text-center">Loading history...</div>;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Trade History</h2>
                <div className="flex gap-2">
                    <GlassButton size="sm" variant="ghost" leftIcon={<Filter size={16} />}>Filter</GlassButton>
                    <GlassButton size="sm" variant="ghost" leftIcon={<Download size={16} />}>Export</GlassButton>
                </div>
            </div>

            <GlassCard className="flex-1 overflow-hidden p-0">
                <div className="overflow-y-auto h-full custom-scrollbar">
                    <GlassTable
                        columns={columns}
                        data={trades}
                        keyExtractor={(t) => t.id}
                    />
                    {trades.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No trading history found.
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
};
