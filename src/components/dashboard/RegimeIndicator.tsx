
import React from 'react';
import { Activity, Zap, AlertTriangle, TrendingUp, Anchor } from 'lucide-react';
import { GlassCard } from '../ui/glass/GlassCard';

interface RegimeIndicatorProps {
    regime: 'TREND' | 'RANGE' | 'CHAOS' | 'TRANSITION' | string;
    confidence?: number;
    className?: string;
}

export const RegimeIndicator: React.FC<RegimeIndicatorProps> = ({ regime, confidence, className }) => {
    // Determine visuals based on regime
    const getVisuals = () => {
        switch (regime?.toUpperCase()) {
            case 'TREND':
                return {
                    icon: <TrendingUp size={20} />,
                    label: 'TRENDING',
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/20',
                    desc: 'Strong directional movement. Trend following strategies active.'
                };
            case 'RANGE':
                return {
                    icon: <Anchor size={20} />,
                    label: 'RANGING',
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    desc: 'Price stabilizing. Mean reversion strategies favored.'
                };
            case 'CHAOS':
                return {
                    icon: <AlertTriangle size={20} />,
                    label: 'CHAOTIC',
                    color: 'text-red-400',
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/20',
                    desc: 'High entropy/volatility. Trading paused or minimal size.'
                };
            default:
                return {
                    icon: <Activity size={20} />,
                    label: regime || 'UNKNOWN',
                    color: 'text-slate-400',
                    bg: 'bg-slate-500/10',
                    border: 'border-slate-500/20',
                    desc: 'Analyzing market structure...'
                };
        }
    };

    const visuals = getVisuals();

    return (
        <GlassCard className={`flex items-center gap-4 ${visuals.border} ${className}`}>
            <div className={`p-3 rounded-xl ${visuals.bg} ${visuals.color}`}>
                {visuals.icon}
            </div>
            <div>
                <h4 className={`font-bold ${visuals.color} text-sm tracking-wider flex items-center gap-2`}>
                    {visuals.label}
                    {confidence && (
                        <span className="text-xs opacity-70 bg-black/20 px-1.5 py-0.5 rounded">
                            {(confidence * 100).toFixed(0)}% Conf
                        </span>
                    )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                    {visuals.desc}
                </p>
            </div>
        </GlassCard>
    );
};
