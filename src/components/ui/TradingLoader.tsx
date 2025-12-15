
import React from 'react';

export const TradingLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="candles-loader">
                <div className="candle candle-1"></div>
                <div className="candle candle-2"></div>
                <div className="candle candle-3"></div>
                <div className="candle candle-4"></div>
            </div>
            <div className="text-xs font-medium text-emerald-400 animate-pulse tracking-widest uppercase">
                Loading Market Data
            </div>

            <style>{`
                .candles-loader {
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    height: 40px;
                    gap: 6px;
                }
                
                .candle {
                    width: 6px;
                    background: #10b981;
                    border-radius: 2px;
                    position: relative;
                    animation: candle-fluctuate 1.2s infinite ease-in-out;
                    box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
                }
                
                /* Wicks */
                .candle::before {
                    content: '';
                    position: absolute;
                    top: -4px;
                    left: 2px;
                    width: 2px;
                    height: calc(100% + 8px);
                    background: rgba(16, 185, 129, 0.5);
                    z-index: -1;
                }

                .candle-1 { height: 30%; animation-delay: 0s; }
                .candle-2 { height: 60%; animation-delay: 0.1s; background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
                .candle-2::before { background: rgba(239, 68, 68, 0.5); }
                
                .candle-3 { height: 40%; animation-delay: 0.2s; }
                .candle-4 { height: 80%; animation-delay: 0.3s; }

                @keyframes candle-fluctuate {
                    0%, 100% { height: 30%; opacity: 0.8; }
                    50% { height: 80%; opacity: 1; }
                }
            `}</style>
        </div>
    );
};
