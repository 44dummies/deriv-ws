import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function TradingDashboard() {
    const [metrics, setMetrics] = useState<any>(null);
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            // Fetch Status
            const resStatus = await fetch(`${API_URL}/api/trading-v2/status`);
            const dataStatus = await resStatus.json();
            setStatus(dataStatus);

            // Fetch Metrics
            const resMetrics = await fetch(`${API_URL}/api/trading-v2/metrics`);
            const dataMetrics = await resMetrics.json();
            setMetrics(dataMetrics);
        } catch (err) {
            console.error('Failed to fetch trading data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center text-white">Loading Trading Engine...</div>;

    return (
        <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Pro Trading Dashboard</h1>
                <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded ${status?.connected ? 'bg-green-500' : 'bg-red-500'} text-white text-sm`}>
                        {status?.connected ? 'Deriv: Connected' : 'Deriv: Disconnected'}
                    </span>
                    <span className={`px-3 py-1 rounded ${status?.circuitBreaker ? 'bg-red-600' : 'bg-green-600'} text-white text-sm`}>
                        {status?.circuitBreaker ? 'HALTED' : 'System OK'}
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800 border-slate-700 border rounded-lg">
                    <div className="text-gray-400 text-sm">Total PnL</div>
                    <div className={`text-2xl font-bold ${metrics?.summary.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${metrics?.summary.netPnL.toFixed(2)}
                    </div>
                </div>
                <div className="p-4 bg-slate-800 border-slate-700 border rounded-lg">
                    <div className="text-gray-400 text-sm">Win Rate</div>
                    <div className="text-2xl font-bold text-blue-400">{metrics?.summary.winRate}%</div>
                </div>
                <div className="p-4 bg-slate-800 border-slate-700 border rounded-lg">
                    <div className="text-gray-400 text-sm">Total Trades</div>
                    <div className="text-2xl font-bold text-white">{metrics?.summary.totalTrades}</div>
                </div>
                <div className="p-4 bg-slate-800 border-slate-700 border rounded-lg">
                    <div className="text-gray-400 text-sm">Exposure</div>
                    <div className="text-2xl font-bold text-yellow-400">${status?.exposure || 0}</div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-800 border-slate-700 border rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Equity Curve (24h)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics?.metrics}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="time" hide />
                                <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="p-4 bg-slate-800 border-slate-700 border rounded-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Balance History</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics?.metrics}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="time" hide />
                                <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
