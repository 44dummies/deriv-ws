import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import { ChartDataPoint } from '../../stores/useRealTimeStore';

interface PerformanceChartProps {
    data: ChartDataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-card rounded-md border border-border">
                Waiting for data...
            </div>
        );
    }

    return (
        <div className="p-6 rounded-lg border border-border bg-card">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Performance</h2>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                color: 'hsl(var(--foreground))'
                            }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="hsl(var(--primary))"
                            fillOpacity={0.1}
                            name="Balance"
                        />
                        <Area
                            type="monotone"
                            dataKey="pnl"
                            stroke="hsl(var(--foreground))"
                            strokeWidth={2}
                            fill="hsl(var(--foreground))"
                            fillOpacity={0.05}
                            name="Total PnL"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
