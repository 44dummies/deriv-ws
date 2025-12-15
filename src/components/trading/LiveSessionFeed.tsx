import React, { useState, useEffect, useRef } from 'react';
import { Radio, Activity, Zap, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Target, Wifi, WifiOff } from 'lucide-react';
import { GlassCard } from '../ui/glass/GlassCard';

interface TickData {
    market: string;
    tick: number;
    time: number;
    digit?: number;
}

interface SignalData {
    market: string;
    side: string;
    digit: number;
    confidence: number;
    timestamp: string;
}

interface TradeData {
    type: string; // 'open' or 'close'
    contractId?: string;
    market?: string;
    side?: string;
    signal?: string;
    stake?: number;
    profit?: number;
    result?: string;
    payout?: number;
    timestamp: string;
}

interface ActivityItem {
    id: number;
    type: 'tick' | 'signal' | 'trade_open' | 'trade_close' | 'session_joined';
    message?: string;
    data?: any;
    timestamp: string;
    color: 'blue' | 'emerald' | 'red' | 'amber' | 'purple' | 'slate';
}

interface LiveSessionFeedProps {
    sessionId: string;
    sessionName: string;
    market: string;
    latestTick: TickData | null;
    latestSignal: SignalData | null;
    latestTrade: TradeData | null;
    isConnected: boolean;
    activityLog: any[];
    onClearLog?: () => void;
}

const LiveSessionFeed: React.FC<LiveSessionFeedProps> = ({
    sessionId,
    sessionName,
    market,
    latestTick,
    latestSignal,
    latestTrade,
    isConnected,
    activityLog,
    onClearLog
}) => {
    const [priceHistory, setPriceHistory] = useState<number[]>([]);
    const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
    const [activeSignal, setActiveSignal] = useState<SignalData | null>(null);
    const previousPrice = useRef<number | null>(null);

    // Update price history and direction on tick
    useEffect(() => {
        if (latestTick?.tick) {
            const newPrice = latestTick.tick;

            // Determine direction
            if (previousPrice.current !== null) {
                setPriceDirection(newPrice > previousPrice.current ? 'up' :
                    newPrice < previousPrice.current ? 'down' : null);
            }
            previousPrice.current = newPrice;

            // Update history (keep last 30 for sparkline)
            setPriceHistory(prev => [...prev.slice(-29), newPrice]);

            // Clear direction flash after 500ms
            setTimeout(() => setPriceDirection(null), 500);
        }
    }, [latestTick]);

    // Track active signal with expiry
    useEffect(() => {
        if (latestSignal && latestSignal.confidence > 0) {
            setActiveSignal(latestSignal);
            // Signal expires after 10 seconds
            const timer = setTimeout(() => setActiveSignal(null), 10000);
            return () => clearTimeout(timer);
        }
    }, [latestSignal]);

    // Extract last digit from price
    const getLastDigit = (price: number): number => {
        const priceStr = price.toString().replace('.', '');
        return parseInt(priceStr[priceStr.length - 1]);
    };

    return (
        <div className="space-y-4">
            {/* Connection Status Bar */}
            <div className={`flex items-center justify-between px-4 py-2 rounded-lg border ${isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
                }`}>
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <>
                            <Wifi className="text-emerald-400 animate-pulse" size={16} />
                            <span className="text-emerald-400 text-sm font-medium">LIVE</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="text-red-400" size={16} />
                            <span className="text-red-400 text-sm font-medium">DISCONNECTED</span>
                        </>
                    )}
                </div>
                <span className="text-xs text-slate-500 font-mono">{sessionName}</span>
            </div>

            {/* Live Price Display */}
            <GlassCard className={`relative overflow-hidden transition-colors duration-300 ${priceDirection === 'up' ? 'bg-emerald-500/10 border-emerald-500/30' :
                priceDirection === 'down' ? 'bg-red-500/10 border-red-500/30' :
                    'bg-white/5 border-white/10'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${priceDirection === 'up' ? 'bg-emerald-500/20 text-emerald-400' :
                            priceDirection === 'down' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400'
                            }`}>
                            {priceDirection === 'up' ? <TrendingUp size={20} /> :
                                priceDirection === 'down' ? <TrendingDown size={20} /> :
                                    <Activity size={20} />}
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">{market} Price</div>
                            <div className={`text-2xl font-bold font-mono transition-colors duration-300 ${priceDirection === 'up' ? 'text-emerald-400' :
                                priceDirection === 'down' ? 'text-red-400' :
                                    'text-white'
                                }`}>
                                {latestTick?.tick?.toFixed(4) || '—'}
                            </div>
                        </div>
                    </div>

                    {/* Last Digit Display */}
                    <div className="text-center">
                        <div className="text-xs text-slate-500 uppercase">Last Digit</div>
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-black/30 border border-white/10">
                            <span className="text-2xl font-bold font-mono text-amber-400">
                                {latestTick?.tick ? getLastDigit(latestTick.tick) : '-'}
                            </span>
                        </div>
                    </div>

                    {/* Mini Sparkline */}
                    <div className="hidden sm:block w-24 h-12">
                        <svg viewBox="0 0 100 40" className="w-full h-full">
                            {priceHistory.length > 1 && (
                                <polyline
                                    fill="none"
                                    stroke={priceDirection === 'up' ? '#10B981' :
                                        priceDirection === 'down' ? '#EF4444' : '#3B82F6'}
                                    strokeWidth="2"
                                    points={priceHistory.map((price, i) => {
                                        const min = Math.min(...priceHistory);
                                        const max = Math.max(...priceHistory);
                                        const range = max - min || 1;
                                        const x = (i / (priceHistory.length - 1)) * 100;
                                        const y = 40 - ((price - min) / range) * 40;
                                        return `${x},${y}`;
                                    }).join(' ')}
                                />
                            )}
                        </svg>
                    </div>
                </div>
            </GlassCard>

            {/* Active Signal Display */}
            {activeSignal && (
                <GlassCard className={`border-2 animate-pulse ${activeSignal.side === 'OVER' ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className={activeSignal.side === 'OVER' ? 'text-emerald-400' : 'text-red-400'} size={24} />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-white">{activeSignal.side}</span>
                                    <span className="text-2xl font-bold text-amber-400 font-mono">{activeSignal.digit}</span>
                                </div>
                                <div className="text-xs text-slate-500">{activeSignal.market}</div>
                            </div>
                        </div>

                        {/* Confidence Meter */}
                        <div className="text-right">
                            <div className="text-xs text-slate-500 mb-1">Confidence</div>
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${activeSignal.confidence > 0.7 ? 'bg-emerald-500' :
                                            activeSignal.confidence > 0.5 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${activeSignal.confidence * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold font-mono text-white">
                                    {(activeSignal.confidence * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Activity Feed */}
            <GlassCard className="border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-full">
                            <Radio className="text-blue-400 animate-pulse" size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Live Activity</h3>
                            <p className="text-xs text-slate-500">Real-time trade signals & execution</p>
                        </div>
                    </div>
                    {activityLog.length > 0 && onClearLog && (
                        <button
                            onClick={onClearLog}
                            className="text-xs text-slate-500 hover:text-white transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                    {activityLog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Activity size={40} className="mb-3 opacity-50 animate-pulse" />
                            <p className="text-sm">Waiting for trading activity...</p>
                            <p className="text-xs mt-1 opacity-60">Signals and trades will appear here</p>
                        </div>
                    ) : (
                        activityLog.map((item) => (
                            <div
                                key={item.id}
                                className={`p-3 rounded-lg border flex items-center justify-between transition-all hover:bg-white/5 ${item.type === 'signal' ? 'bg-blue-500/5 border-blue-500/20' :
                                    item.type === 'session_joined' ? 'bg-emerald-500/5 border-emerald-500/20' :
                                        item.result === 'won' ? 'bg-emerald-500/5 border-emerald-500/20' :
                                            item.result === 'lost' ? 'bg-red-500/5 border-red-500/20' :
                                                'bg-white/5 border-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${item.type === 'signal' ? 'bg-blue-500/20 text-blue-400' :
                                        item.type === 'session_joined' ? 'bg-emerald-500/20 text-emerald-400' :
                                            item.result === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                                                item.result === 'lost' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-slate-500/20 text-slate-300'
                                        }`}>
                                        {item.type === 'signal' ? '🎯 SIG' :
                                            item.type === 'session_joined' ? '✓ JOIN' :
                                                item.type === 'trade_open' ? '📈 OPEN' :
                                                    '📊 TRADE'}
                                    </span>
                                    <div>
                                        <div className="text-sm text-white font-medium">
                                            {item.side && `${item.side} ${item.digit !== undefined ? `digit ${item.digit}` : ''}`}
                                            {item.message && item.message}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            {item.market && <span>{item.market}</span>}
                                            <span>•</span>
                                            <Clock size={10} className="inline" />
                                            <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    {item.profit !== undefined && (
                                        <span className={`text-sm font-mono font-bold ${item.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                            }`}>
                                            {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)}
                                        </span>
                                    )}
                                    {item.confidence !== undefined && (
                                        <span className="text-xs font-mono text-blue-300">
                                            {(item.confidence * 100).toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export default LiveSessionFeed;
