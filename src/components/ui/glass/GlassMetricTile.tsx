
import React from 'react';

interface GlassMetricTileProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    className?: string;
}

export const GlassMetricTile: React.FC<GlassMetricTileProps> = ({
    label,
    value,
    subValue,
    icon,
    trend,
    trendValue,
    className = ''
}) => {
    const trendColors = {
        up: 'text-emerald-400',
        down: 'text-red-400',
        neutral: 'text-slate-400'
    };

    return (
        <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300 group ${className}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-slate-400 text-sm font-medium">{label}</span>
                {icon && <div className="text-slate-500 group-hover:text-white transition-colors">{icon}</div>}
            </div>

            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
                {subValue && <span className="text-xs text-slate-500">{subValue}</span>}
            </div>

            {(trend || trendValue) && (
                <div className={`text-xs mt-2 flex items-center gap-1 ${trend ? trendColors[trend] : 'text-slate-400'}`}>
                    {trend === 'up' && '↑'}
                    {trend === 'down' && '↓'}
                    {trendValue}
                </div>
            )}
        </div>
    );
};
