import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

function useTradingHistory() {
    return useQuery({
        queryKey: ['trading-history'],
        queryFn: async () => {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const res = await fetch(`${baseUrl}/api/v1/trades?limit=200`, {
                credentials: 'include'
            });
            if (!res.ok) return { trades: [] };
            return res.json();
        },
        staleTime: 15000,
        refetchInterval: 15000
    });
}

export default function Statistics() {
    const { data: tradesData, refetch, isFetching } = useTradingHistory();
    const trades = tradesData?.trades || [];

    const metrics = useMemo(() => {
        if (!trades.length) {
            return {
                totalTrades: 0,
                winRate: 0,
                totalProfit: 0,
                avgWin: 0,
                avgLoss: 0
            };
        }

        const pnlValues = trades.map((t: any) => Number(t.pnl || 0));
        const wins = pnlValues.filter((p: number) => p > 0);
        const losses = pnlValues.filter((p: number) => p < 0);
        const totalProfit = pnlValues.reduce((sum: number, p: number) => sum + p, 0);
        const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

        return {
            totalTrades: trades.length,
            winRate,
            totalProfit,
            avgWin: wins.length > 0 ? wins.reduce((sum: number, p: number) => sum + p, 0) / wins.length : 0,
            avgLoss: losses.length > 0 ? Math.abs(losses.reduce((sum: number, p: number) => sum + p, 0) / losses.length) : 0
        };
    }, [trades]);

    const performanceData = useMemo(() => {
        const grouped = new Map<string, number>();
        trades.forEach((trade: any) => {
            const date = new Date(trade.created_at || trade.executed_at || Date.now());
            const key = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const prev = grouped.get(key) || 0;
            grouped.set(key, prev + Number(trade.pnl || 0));
        });

        return Array.from(grouped.entries()).slice(-14).map(([name, profit]) => ({
            name,
            profit: Number(profit.toFixed(2))
        }));
    }, [trades]);

    const distributionData = useMemo(() => {
        const grouped = new Map<string, number>();
        trades.forEach((trade: any) => {
            const key = trade.market || 'Unknown';
            grouped.set(key, (grouped.get(key) || 0) + 1);
        });
        return Array.from(grouped.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [trades]);

    const distributionOpacity = useMemo(() => (
        distributionData.map((_, index) => Math.max(0.2, 0.85 - index * 0.12))
    ), [distributionData]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Statistics</h1>
                    <p className="text-sm text-muted-foreground">Trade performance and distribution.</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/60 transition-colors duration-150 ease-out"
                >
                    {isFetching ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Total trades</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{metrics.totalTrades}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Win rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{metrics.winRate.toFixed(1)}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Total PnL</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{metrics.totalProfit.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Avg win</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{metrics.avgWin.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Avg loss</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-semibold">{metrics.avgLoss.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                            color: 'hsl(var(--foreground))'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Market distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {distributionData.map((entry, index) => (
                                            <Cell
                                                key={entry.name}
                                                fill="hsl(var(--primary))"
                                                fillOpacity={distributionOpacity[index] ?? 0.2}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '6px',
                                            color: 'hsl(var(--foreground))'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
