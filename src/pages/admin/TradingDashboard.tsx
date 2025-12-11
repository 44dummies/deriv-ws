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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
            <div className="text-white text-xl animate-pulse">Loading Trading Engine...</div>
        </div>
    );

    return (
        <div className="relative min-h-screen bg-[#0a0a0f] overflow-hidden">
            {/* Liquid Glass Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Animated gradient blobs */}
                <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-5%] left-[10%] w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/15 to-cyan-500/15 rounded-full mix-blend-screen filter blur-[80px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-gradient-to-bl from-pink-500/10 to-orange-500/10 rounded-full mix-blend-screen filter blur-[60px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
                {/* Noise texture overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />
            </div>

            {/* Main Content */}
            <div className="relative z-10 p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-200">
                        Pro Trading Dashboard
                    </h1>
                    <div className="flex flex-wrap gap-2">
                        <span className={`px-4 py-2 rounded-full backdrop-blur-xl border text-sm font-medium transition-all ${status?.connected
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/20'
                                : 'bg-red-500/20 border-red-500/30 text-red-400 shadow-lg shadow-red-500/20'
                            }`}>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                            {status?.connected ? 'Deriv: Connected' : 'Deriv: Disconnected'}
                        </span>
                        <span className={`px-4 py-2 rounded-full backdrop-blur-xl border text-sm font-medium transition-all ${status?.circuitBreaker
                                ? 'bg-red-600/20 border-red-600/30 text-red-400'
                                : 'bg-emerald-600/20 border-emerald-600/30 text-emerald-400'
                            }`}>
                            {status?.circuitBreaker ? '⚠️ HALTED' : '✓ System OK'}
                        </span>
                    </div>
                </div>

                {/* KPI Cards - Glass Effect */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {/* Total PnL Card */}
                    <div className="group p-4 md:p-5 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
                        <div className="text-gray-400 text-xs md:text-sm mb-1">Total PnL</div>
                        <div className={`text-xl md:text-3xl font-bold ${metrics?.summary?.netPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${metrics?.summary?.netPnL?.toFixed(2) || '0.00'}
                        </div>
                        <div className={`text-xs mt-2 ${metrics?.summary?.netPnL >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                            {metrics?.summary?.netPnL >= 0 ? '↑ Profit' : '↓ Loss'}
                        </div>
                    </div>

                    {/* Win Rate Card */}
                    <div className="group p-4 md:p-5 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                        <div className="text-gray-400 text-xs md:text-sm mb-1">Win Rate</div>
                        <div className="text-xl md:text-3xl font-bold text-blue-400">
                            {metrics?.summary?.winRate || 0}%
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${metrics?.summary?.winRate || 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Total Trades Card */}
                    <div className="group p-4 md:p-5 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
                        <div className="text-gray-400 text-xs md:text-sm mb-1">Total Trades</div>
                        <div className="text-xl md:text-3xl font-bold text-white">
                            {metrics?.summary?.totalTrades || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            Last 24 hours
                        </div>
                    </div>

                    {/* Exposure Card */}
                    <div className="group p-4 md:p-5 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.05] transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10">
                        <div className="text-gray-400 text-xs md:text-sm mb-1">Exposure</div>
                        <div className="text-xl md:text-3xl font-bold text-yellow-400">
                            ${status?.exposure || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            Current risk
                        </div>
                    </div>
                </div>

                {/* Charts - Glass Effect */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {/* Equity Curve */}
                    <div className="p-4 md:p-6 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.12] transition-all">
                        <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Equity Curve (24h)
                        </h3>
                        <div className="h-48 md:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics?.metrics}>
                                    <defs>
                                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="time" hide />
                                    <YAxis stroke="rgba(255,255,255,0.2)" domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(10,10,15,0.9)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        itemStyle={{ color: '#10b981' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="equity"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={false}
                                        fill="url(#equityGradient)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Balance History */}
                    <div className="p-4 md:p-6 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.12] transition-all">
                        <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Balance History
                        </h3>
                        <div className="h-48 md:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics?.metrics}>
                                    <defs>
                                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="time" hide />
                                    <YAxis stroke="rgba(255,255,255,0.2)" domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(10,10,15,0.9)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        itemStyle={{ color: '#3b82f6' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                        fill="url(#balanceGradient)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
