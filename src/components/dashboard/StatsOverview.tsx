import React from 'react';
import { GlassCard } from '../ui/glass/GlassCard';
import { GlassBadge } from '../ui/glass/GlassBadge';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Activity } from 'lucide-react';

interface StatsOverviewProps {
    balance: number;
    currency: string;
    todayPnL: number;
    winRate: number;
    totalTrades: number;
    accountType: 'Demo' | 'Real';
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
    balance,
    currency = 'USD',
    todayPnL,
    winRate,
    totalTrades,
    accountType
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Balance Card */}
            <GlassCard className="relative overflow-hidden group">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-liquid-text-muted mb-1 flex items-center gap-2">
                            Total Balance
                            <GlassBadge variant={accountType === 'Demo' ? 'info' : 'warning'}>
                                {accountType}
                            </GlassBadge>
                        </p>
                        <h2 className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-1">
                            <span className="text-lg text-liquid-text-dim">$</span>
                            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                    </div>
                    <div className="p-3 rounded-xl bg-liquid-accent/10 text-liquid-accent group-hover:scale-110 transition-transform duration-300">
                        <Wallet size={24} />
                    </div>
                </div>
                {/* Decoration blob */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-liquid-accent/10 rounded-full blur-2xl group-hover:bg-liquid-accent/20 transition-colors" />
            </GlassCard>

            {/* P&L Card */}
            <GlassCard className="relative overflow-hidden group">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-liquid-text-muted mb-1">Today's P&L</p>
                        <h2 className={`text-3xl font-bold tracking-tight flex items-baseline gap-1 
                            ${todayPnL >= 0 ? 'text-liquid-success' : 'text-liquid-warning'}
                        `}>
                            {todayPnL >= 0 ? '+' : ''}{todayPnL.toFixed(2)}
                            <span className="text-sm text-liquid-text-dim">{currency}</span>
                        </h2>
                    </div>
                    <div className={`
                        p-3 rounded-xl group-hover:scale-110 transition-transform duration-300
                        ${todayPnL >= 0 ? 'bg-liquid-success/10 text-liquid-success' : 'bg-liquid-warning/10 text-liquid-warning'}
                    `}>
                        {todayPnL >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                </div>
            </GlassCard>

            {/* Win Rate Card */}
            <GlassCard className="relative overflow-hidden group">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-liquid-text-muted mb-1">Win Rate</p>
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            {winRate.toFixed(1)}%
                        </h2>
                    </div>
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="transform -rotate-90 w-12 h-12">
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-700" />
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                                className={winRate >= 50 ? 'text-liquid-success' : 'text-liquid-warning'}
                                strokeDasharray={125.6}
                                strokeDashoffset={125.6 - (winRate / 100) * 125.6}
                            />
                        </svg>
                    </div>
                </div>
            </GlassCard>

            {/* Total Trades Card */}
            <GlassCard className="relative overflow-hidden group">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-liquid-text-muted mb-1">Total Trades</p>
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            {totalTrades}
                        </h2>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                        <Activity size={24} />
                    </div>
                </div>
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
            </GlassCard>
        </div>
    );
};
