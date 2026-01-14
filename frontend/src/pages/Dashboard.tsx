import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, TrendingUp, TrendingDown, Wallet, Plus, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { useDerivBalance } from '../hooks/useDerivBalance';
import { useDerivTicks } from '../hooks/useDerivTicks';
import { useCreateSession } from '../hooks/useSessions';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import ManualTrade from '../components/ManualTrade';

const watchlist = ['R_100', 'R_50', 'R_25', 'JD100', 'JD50', 'JD25'];

function useSummaryStats() {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/stats/user-summary`, { credentials: 'include' });
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 30000,
        refetchInterval: 30000
    });
}

function useRecentTrades() {
    return useQuery({
        queryKey: ['recent-trades'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/trades?limit=5`, { credentials: 'include' });
            if (!res.ok) return { trades: [] };
            return res.json();
        },
        staleTime: 15000,
    });
}

export default function Dashboard() {
    const { user } = useAuthStore();
    const { data: summary } = useSummaryStats();
    const { data: recentTrades } = useRecentTrades();
    const { mutate: createSession, isPending } = useCreateSession();
    const { ticks, connected } = useDerivTicks({ symbols: watchlist });
    const [showTrade, setShowTrade] = useState(false);

    useDerivBalance();

    const activeAccount = user?.deriv_accounts?.find(a => a.loginid === user?.active_account_id);
    const balance = activeAccount?.balance ?? 0;
    const currency = activeAccount?.currency ?? 'USD';

    const kpis = useMemo(() => {
        const totalProfit = summary?.trading?.total_profit ?? 0;
        const winRate = summary?.trading?.win_rate ?? 0;
        const totalTrades = summary?.trading?.total_trades ?? 0;
        const activeSessions = summary?.sessions?.active ?? 0;

        return [
            { label: 'Active sessions', value: activeSessions },
            { label: 'Total trades', value: totalTrades },
            { label: 'Total PnL', value: `${totalProfit.toFixed(2)} ${currency}` },
            { label: 'Win rate', value: `${Number(winRate).toFixed(1)}%` },
        ];
    }, [summary, currency]);

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Monitor your sessions and market activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowTrade(true)}
                        className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/60 transition-colors flex items-center gap-2"
                    >
                        <Zap className="w-4 h-4" />
                        Manual trade
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => createSession()}
                        disabled={isPending}
                        className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 shadow-lg shadow-primary/25 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {isPending ? 'Creating...' : 'Create session'}
                    </motion.button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Account balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                                    <Wallet className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{balance.toFixed(2)} {currency}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {activeAccount?.is_virtual ? 'Demo account' : 'Real account'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
                {kpis.map((item, i) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                    >
                        <Card className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{item.value}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-primary" />
                                    Market watch
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
                                    <span className="text-xs text-muted-foreground">
                                        {connected ? 'Live' : 'Connecting...'}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-2">
                                {watchlist.map((symbol, i) => {
                                    const tick = ticks.get(symbol);
                                    const change = tick?.changePercent ?? 0;
                                    const isUp = change > 0;
                                    const isDown = change < 0;
                                    return (
                                        <motion.div
                                            key={symbol}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: i * 0.05 }}
                                            whileHover={{ scale: 1.01 }}
                                            className="flex items-center justify-between border border-border/50 rounded-lg px-4 py-3 hover:border-primary/50 transition-colors"
                                        >
                                            <div className="font-medium">{symbol}</div>
                                            <div className="flex items-center gap-4">
                                                <span className="tabular-nums font-semibold">{tick ? tick.quote.toFixed(2) : '—'}</span>
                                                <div className={`flex items-center gap-1.5 min-w-[80px] justify-end ${isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                    <span className="text-sm tabular-nums">
                                                        {tick ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '—'}
                                                    </span>
                                                    {isUp && <TrendingUp className="w-4 h-4" />}
                                                    {isDown && <TrendingDown className="w-4 h-4" />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Recent trades</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-2">
                                {(recentTrades?.trades || []).length === 0 && (
                                    <div className="text-sm text-muted-foreground py-8 text-center">No trades yet</div>
                                )}
                                {(recentTrades?.trades || []).map((trade: any, i: number) => {
                                    const pnl = Number(trade.pnl || 0);
                                    const pnlColor = pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : '';
                                    return (
                                        <motion.div
                                            key={trade.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: i * 0.05 }}
                                            className="flex items-center justify-between border border-border/50 rounded-lg px-4 py-3 hover:border-primary/50 transition-colors"
                                        >
                                            <div>
                                                <div className="font-medium">{trade.market}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{trade.contract_type}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-semibold tabular-nums ${pnlColor}`}>
                                                    {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{trade.status}</div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {showTrade && (
                <ManualTrade onClose={() => setShowTrade(false)} />
            )}
        </div>
    );
}
