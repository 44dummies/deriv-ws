import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { getLiveStats } from '../../trading/tradingApi';

const LiveMarketAnalysis = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await getLiveStats();
                if (response.success && response.data) {
                    // Assuming we are looking at R_100 for now
                    setStats(response.data['R_100']);
                }
            } catch (err) {
                console.error('Failed to fetch live stats:', err);
                setError('Live feed disconnected');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 2000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="animate-pulse h-48 bg-white/5 rounded-xl"></div>;
    if (error) return <div className="text-red-400 text-sm p-4 border border-red-500/20 rounded-xl bg-red-500/5">{error}</div>;
    if (!stats) return <div className="text-gray-400 text-sm p-4">No market data available</div>;

    const { freq, confidence, side, digit, parts } = stats;

    // Find max frequency for scaling
    const maxFreq = Math.max(...(freq || [0]));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Live Market Analysis (R_100)
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Confidence:</span>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                        confidence >= 0.7 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                        {(confidence * 100).toFixed(0)}%
                    </div>
                </div>
            </div>

            {/* Signal Indicator */}
            <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${
                    side === 'OVER' ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Signal</span>
                        {side === 'OVER' ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="text-2xl font-bold text-white">OVER</div>
                    <div className="text-xs text-gray-500 mt-1">Target: Digit &gt; 4</div>
                </div>
                <div className={`p-4 rounded-xl border ${
                    side === 'UNDER' ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Signal</span>
                        {side === 'UNDER' ? <TrendingDown className="w-4 h-4 text-red-400" /> : <TrendingUp className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="text-2xl font-bold text-white">UNDER</div>
                    <div className="text-xs text-gray-500 mt-1">Target: Digit &lt; 5</div>
                </div>
            </div>

            {/* Digit Frequency Chart */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Digit Frequency (Last 100 Ticks)</span>
                    <span>Predicted: <span className="text-white font-bold">{digit}</span></span>
                </div>
                <div className="h-32 flex items-end justify-between gap-1">
                    {freq && freq.map((f, i) => {
                        const height = (f / maxFreq) * 100;
                        const isTarget = i === digit;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                <div 
                                    className={`w-full rounded-t-sm transition-all duration-500 ${
                                        isTarget ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10 group-hover:bg-white/20'
                                    }`}
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                ></div>
                                <span className={`text-[10px] font-mono ${isTarget ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                                    {i}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Component Scores */}
            <div className="grid grid-cols-3 gap-2">
                {parts && Object.entries(parts).map(([key, value]) => (
                    <div key={key} className="p-2 rounded bg-white/5 border border-white/5">
                        <div className="text-[10px] text-gray-400 uppercase">{key}</div>
                        <div className="text-sm font-mono font-bold text-white">{value.toFixed(2)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveMarketAnalysis;
