
import React from 'react';

interface TradingLoaderProps {
    className?: string;
    showText?: boolean;
}

export const TradingLoader: React.FC<TradingLoaderProps> = ({ className = '', showText = true }) => {
    return (
        <div className={`flex flex-col items-center justify-center p-4 space-y-4 ${className}`}>
            {/* Candlestick Animation */}
            <div className="flex items-end gap-1 h-12">
                <div className="w-2 bg-brand-red h-4 animate-[pulse_1s_ease-in-out_infinite]" />
                <div className="w-2 bg-emerald-500 h-8 animate-[pulse_1.2s_ease-in-out_infinite_0.1s]" />
                <div className="w-2 bg-brand-red h-6 animate-[pulse_0.8s_ease-in-out_infinite_0.2s]" />
                <div className="w-2 bg-emerald-500 h-10 animate-[pulse_1.5s_ease-in-out_infinite_0.3s]" />
            </div>
            {showText && <div className="text-gray-500 font-mono text-xs tracking-widest uppercase">Initializing Feed...</div>}
        </div>
    );
};
