import React, { useState } from 'react';
import { GlassCard } from '../ui/glass/GlassCard';
import { GlassButton } from '../ui/glass/GlassButton';
import { GlassInput } from '../ui/glass/GlassInput';
import { Play, Square, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface LiveTradingViewProps {
    isConnected: boolean;
    currentPrice: number;
    symbol: string;
    onTrade: (type: 'CALL' | 'PUT', stake: number) => void;
}

export const LiveTradingView: React.FC<LiveTradingViewProps> = ({
    isConnected,
    currentPrice,
    symbol = 'R_100',
    onTrade
}) => {
    const [stake, setStake] = useState(10);
    const [isTrading, setIsTrading] = useState(false);

    const handleTrade = (type: 'CALL' | 'PUT') => {
        setIsTrading(true);
        onTrade(type, stake);
        // Reset after generic delay for demo
        setTimeout(() => setIsTrading(false), 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Chart Area */}
            <GlassCard className="col-span-1 lg:col-span-2 flex flex-col relative p-0 overflow-hidden">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/5">
                        <span className="font-bold text-white">{symbol}</span>
                        <span className="text-xs text-liquid-text-muted">Volatility 100 Index</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isConnected ? 'LIVE' : 'OFFLINE'}
                    </div>
                </div>

                {/* Placeholder for real chart library */}
                <div className="flex-1 bg-gradient-to-b from-transparent to-liquid-accent/5 flex items-center justify-center relative">
                    <div className="text-center">
                        <h1 className="text-6xl font-mono font-bold text-white tracking-tighter animate-pulse-subtle">
                            {currentPrice.toFixed(2)}
                        </h1>
                        <p className="text-liquid-text-muted mt-2">Waiting for tick data...</p>
                    </div>

                    {/* Grid lines decoration */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }} />
                </div>
            </GlassCard>

            {/* Controls Area */}
            <GlassCard className="flex flex-col gap-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">Trade Execution</h3>

                    <div className="space-y-4">
                        <GlassInput
                            label="Stake Amount ($)"
                            type="number"
                            value={stake}
                            onChange={(e) => setStake(Number(e.target.value))}
                            leftIcon={<span className="text-green-500">$</span>}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            {['10', '20', '50', '100'].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setStake(Number(amt))}
                                    className="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors border border-white/5"
                                >
                                    ${amt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-auto space-y-4">
                    <GlassButton
                        variant="success"
                        className="w-full py-4 text-lg justify-between group"
                        onClick={() => handleTrade('CALL')}
                        isLoading={isTrading}
                    >
                        <span>HIGHER</span>
                        <TrendingUp className="group-hover:-translate-y-1 transition-transform" />
                    </GlassButton>

                    <GlassButton
                        variant="danger"
                        className="w-full py-4 text-lg justify-between group"
                        onClick={() => handleTrade('PUT')}
                        isLoading={isTrading}
                    >
                        <span>LOWER</span>
                        <TrendingDown className="group-hover:translate-y-1 transition-transform" />
                    </GlassButton>
                </div>
            </GlassCard>
        </div>
    );
};
