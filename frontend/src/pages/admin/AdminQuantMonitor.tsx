import { Activity, BarChart3, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const MARKETS = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'JD10', 'JD25', 'JD50', 'JD75', 'JD100'];
const STRATEGIES = [
    'RSI_DIVERGENCE',
    'EMA_CROSS_MOMENTUM',
    'BOLLINGER_SQUEEZE',
    'MACD_HISTOGRAM',
    'STOCHASTIC',
    'VOLATILITY_SPIKE',
    'SUPPORT_RESISTANCE',
    'ADX_TREND',
    'MULTI_TIMEFRAME',
    'ADAPTIVE'
];

export default function AdminQuantMonitor() {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Quant engine monitor
                </h1>
                <p className="text-sm text-muted-foreground">Awaiting live engine feed.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Engine status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-semibold">Unavailable</div>
                        <div className="text-xs text-muted-foreground mt-2">No telemetry stream connected.</div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm text-muted-foreground">Signal stream (last 10m)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">No live data available.</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Market activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        {MARKETS.map((market) => (
                            <div key={market} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                                <span className="font-mono">{market}</span>
                                <span className="text-muted-foreground">—</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Active strategies
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                        {STRATEGIES.map((strategy) => (
                            <div key={strategy} className="border border-border rounded-md px-3 py-2 text-muted-foreground font-mono">
                                {strategy}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
