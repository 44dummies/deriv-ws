import { useState, useEffect } from 'react';
import { BarChart3, Activity, Zap, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { motion } from 'framer-motion';

// Supported Markets
const VOLATILITY_INDICES = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'];
const JUMP_INDICES = ['JD10', 'JD25', 'JD50', 'JD75', 'JD100'];

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
    const [signals, setSignals] = useState<number[]>([]);
    const [marketStats, setMarketStats] = useState<Record<string, number>>({});

    // Simulate live signal stream
    useEffect(() => {
        const interval = setInterval(() => {
            setSignals(prev => {
                const newVal = Math.random() * 0.4 + 0.55; // 0.55 - 0.95 range
                const newArr = [...prev, newVal];
                if (newArr.length > 30) newArr.shift();
                return newArr;
            });

            // Simulate market stats
            const stats: Record<string, number> = {};
            [...VOLATILITY_INDICES, ...JUMP_INDICES].forEach(market => {
                stats[market] = Math.floor(Math.random() * 20);
            });
            setMarketStats(stats);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-accent" />
                    Quant Engine Monitor
                </h1>
                <p className="text-slate-500 text-sm">Live monitoring of the TraderMind Quantitative Trading Engine.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Engine Status */}
                <GlassCard className="p-6 md:col-span-1 border-l-4 border-l-accent">
                    <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Engine Status</h3>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xl font-bold text-white">Online</span>
                    </div>
                    <div className="text-sm font-mono text-slate-500">
                        Version: <span className="text-white">v2.0 (Pure Quant)</span><br />
                        Strategies: <span className="text-white">{STRATEGIES.length} Active</span><br />
                        Markets: <span className="text-white">{VOLATILITY_INDICES.length + JUMP_INDICES.length} Supported</span>
                    </div>
                </GlassCard>

                {/* Trading Stats */}
                <GlassCard className="p-6 md:col-span-2 flex justify-around items-center">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white font-mono">847</div>
                        <div className="text-xs text-slate-500 uppercase mt-1">Signals Today</div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-400 font-mono">68%</div>
                        <div className="text-xs text-slate-500 uppercase mt-1">Win Rate</div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-center">
                        <div className="text-3xl font-bold text-accent font-mono">99.9%</div>
                        <div className="text-xs text-slate-500 uppercase mt-1">Uptime</div>
                    </div>
                </GlassCard>
            </div>

            {/* Live Signal Confidence Stream */}
            <GlassCard className="p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-accent" />
                        Live Signal Confidence Stream
                    </h3>
                    <span className="text-xs font-mono text-green-400 animate-pulse">PROCESSING</span>
                </div>

                <div className="h-48 flex items-end gap-1">
                    {signals.map((val, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${val * 100}%` }}
                            className={`flex-1 rounded-t sm:min-w-[10px] ${val >= 0.7 ? 'bg-green-500/30 border-t border-green-500' :
                                    val >= 0.6 ? 'bg-accent/30 border-t border-accent' :
                                        'bg-yellow-500/30 border-t border-yellow-500'
                                }`}
                            style={{ opacity: 0.3 + (i / 30) * 0.7 }}
                        />
                    ))}
                </div>
                <div className="mt-2 text-xs text-slate-500 font-mono flex justify-between">
                    <span>-60s</span>
                    <span>NOW</span>
                </div>
            </GlassCard>

            {/* Market Activity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Volatility Indices */}
                <GlassCard className="p-4">
                    <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-400" /> Volatility Indices
                    </h3>
                    <div className="space-y-3">
                        {VOLATILITY_INDICES.map(market => (
                            <div key={market} className="flex items-center justify-between">
                                <span className="text-slate-300 font-mono text-sm">{market}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-blue-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(marketStats[market] || 0) * 5}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500 w-8">{marketStats[market] || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Jump Indices */}
                <GlassCard className="p-4">
                    <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-400" /> Jump Indices
                    </h3>
                    <div className="space-y-3">
                        {JUMP_INDICES.map(market => (
                            <div key={market} className="flex items-center justify-between">
                                <span className="text-slate-300 font-mono text-sm">{market}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-yellow-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(marketStats[market] || 0) * 5}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500 w-8">{marketStats[market] || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Active Strategies */}
            <GlassCard className="p-4">
                <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-accent" /> Active Trading Strategies
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {STRATEGIES.map(strategy => (
                        <div
                            key={strategy}
                            className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
                        >
                            <div className="text-xs font-mono text-accent">{strategy}</div>
                            <div className="flex items-center gap-1 mt-1">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-[10px] text-slate-500">Active</span>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* Recent Signals */}
            <GlassCard className="p-4">
                <h3 className="font-bold text-white text-sm mb-4">Recent Signals</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {[
                        { market: 'R_100', type: 'CALL', strategy: 'RSI_DIVERGENCE', confidence: 0.78, time: '2s ago' },
                        { market: 'JD50', type: 'PUT', strategy: 'BOLLINGER_SQUEEZE', confidence: 0.82, time: '8s ago' },
                        { market: 'R_50', type: 'CALL', strategy: 'EMA_CROSS_MOMENTUM', confidence: 0.71, time: '15s ago' },
                        { market: 'JD100', type: 'PUT', strategy: 'MACD_HISTOGRAM', confidence: 0.68, time: '23s ago' },
                        { market: 'R_25', type: 'CALL', strategy: 'MULTI_TIMEFRAME', confidence: 0.85, time: '31s ago' },
                    ].map((signal, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                            <div className="flex items-center gap-3">
                                {signal.type === 'CALL' ? (
                                    <TrendingUp className="h-4 w-4 text-green-400" />
                                ) : (
                                    <TrendingDown className="h-4 w-4 text-red-400" />
                                )}
                                <span className="font-mono text-sm text-white">{signal.market}</span>
                                <span className="text-xs text-slate-500">{signal.strategy}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-mono ${signal.confidence >= 0.75 ? 'text-green-400' : 'text-yellow-400'
                                    }`}>
                                    {(signal.confidence * 100).toFixed(0)}%
                                </span>
                                <span className="text-xs text-slate-600">{signal.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
}
