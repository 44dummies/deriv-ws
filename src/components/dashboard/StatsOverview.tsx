import React from 'react';
import { GlassCard } from '../ui/glass/GlassCard';
import { GlassBadge } from '../ui/glass/GlassBadge';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Activity } from 'lucide-react';

interface StatsOverviewProps {
    realBalance?: number;
    demoBalance?: number;
    currency: string;
    todayPnL: number;
    winRate: number;
    totalTrades: number;
    accountType?: 'Demo' | 'Real';
    lastTradeTime?: string;
}

const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    if (seconds < 10) return "just now";
    return Math.floor(seconds) + "s ago";
};

export const StatsOverview: React.FC<StatsOverviewProps> = ({
    realBalance,
    demoBalance,
    currency = 'USD',
    todayPnL,
    winRate,
    totalTrades,
    accountType,
    lastTradeTime
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Balance Card */}
            <GlassCard className="relative overflow-hidden group p-4 border-brand-card shadow-sm">
                <div className="flex flex-col gap-4">
                    {/* Real Balance */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-2 uppercase tracking-wide font-medium">
                                Real Balance
                            </p>
                            <h2 className="text-xl font-bold text-white tracking-tight flex items-baseline gap-1 font-mono">
                                <span className="text-sm text-slate-500">$</span>
                                {(realBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                            <div className="mt-1">
                                <GlassBadge variant="warning" size="sm">REAL</GlassBadge>
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Wallet size={18} />
                        </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* Demo Balance */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-2 uppercase tracking-wide font-medium">
                                Demo Balance
                            </p>
                            <h2 className="text-lg font-bold text-slate-300 tracking-tight flex items-baseline gap-1 font-mono">
                                <span className="text-sm text-slate-500">$</span>
                                {(demoBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                            <div className="mt-1">
                                <GlassBadge variant="info" size="sm">DEMO</GlassBadge>
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <Activity size={18} />
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* P&L Card */}
            <GlassCard className="relative overflow-hidden group p-4 border-brand-card shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-2 uppercase tracking-wide font-medium">
                            Today's P&L
                        </p>
                        <h2 className={`text-2xl font-bold tracking-tight flex items-baseline gap-1 font-mono
                            ${todayPnL >= 0 ? 'text-emerald-400' : 'text-brand-red'}
                        `}>
                            {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)}
                            <span className="text-sm text-slate-500">{currency}</span>
                        </h2>
                        <div className="mt-2 text-[10px] text-slate-500 font-mono">
                            Daily Target: +$50.00
                        </div>
                    </div>
                    <div className={`
                        p-2 rounded-lg border border-white/5
                        ${todayPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-red/10 text-brand-red'}
                    `}>
                        {todayPnL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                </div>
            </GlassCard>

            {/* Win Rate Card */}
            <GlassCard className="relative overflow-hidden group p-4 border-brand-card shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-2 uppercase tracking-wide font-medium">Win Rate</p>
                        <h2 className="text-2xl font-bold text-white tracking-tight font-mono">
                            {winRate.toFixed(1)}%
                        </h2>
                        <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${winRate >= 50 ? 'bg-emerald-500' : 'bg-brand-red'}`} style={{ width: `${winRate}%` }}></div>
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-brand-card/50 text-slate-300 border border-white/5">
                        <Activity size={18} />
                    </div>
                </div>
            </GlassCard>

            {/* Total Trades Card */}
            <GlassCard className="relative overflow-hidden group p-4 border-brand-card shadow-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-2 uppercase tracking-wide font-medium">Total Trades</p>
                        <h2 className="text-2xl font-bold text-white tracking-tight font-mono">
                            {totalTrades}
                        </h2>
                        <div className="mt-2 text-[10px] text-slate-500 font-mono">
                            Last trade: {getTimeAgo(lastTradeTime)}
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-brand-card/50 text-slate-300 border border-white/5">
                        <TrendingUp size={18} />
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};
