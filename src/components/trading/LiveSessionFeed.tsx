import React from 'react';
import { Clock, Activity, TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { GlassCard } from '../ui/glass/GlassCard';

interface LiveSessionFeedProps {
    sessionId: string;
    sessionName: string;
    market: string;
    latestTick: any;
    latestSignal: any;
    latestTrade: any;
    isConnected: boolean;
    activityLog: any[];
}

const LiveSessionFeed: React.FC<LiveSessionFeedProps> = ({
    sessionId,
    sessionName,
    market,
    latestTick,
    latestSignal, // Kept for future extension or detailed display
    latestTrade,  // Kept for future extension or detailed display
    isConnected,
    activityLog
}) => {
    return (
        <GlassCard className="h-full p-0 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                        <Activity size={18} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{sessionName}</h3>
                        <div className="text-xs text-slate-400 font-mono">{sessionId} • {market}</div>
                    </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                    <span className="tracking-wide">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
                </div>
            </div>

            {/* Feed Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {(!activityLog || activityLog.length === 0) ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center text-slate-500">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6 opacity-50" />
                        </div>
                        <p className="text-sm font-medium">Waiting for session activity...</p>
                        <p className="text-xs text-slate-600 mt-1">Trades and signals will appear here</p>
                    </div>
                ) : (
                    activityLog.map((log: any, index: number) => (
                        <div key={index} className="flex gap-3 text-sm p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                            <div className={`mt-0.5 min-w-[24px] h-6 rounded-lg flex items-center justify-center ${log.type === 'trade'
                                    ? log.data?.status === 'won' ? 'bg-emerald-500/20 text-emerald-400'
                                        : log.data?.status === 'lost' ? 'bg-red-500/20 text-red-400'
                                            : 'bg-blue-500/20 text-blue-400'
                                    : 'bg-slate-700/50 text-slate-400'
                                }`}>
                                {log.type === 'trade' ? <TrendingUp size={14} /> : <Activity size={14} />}
                            </div>
                            <div className="flex-1">
                                <div className="text-slate-200 font-medium flex justify-between">
                                    <span>{log.message || JSON.stringify(log)}</span>
                                    <span className="text-xs text-slate-500 font-mono ml-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                        {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                                    </span>
                                </div>
                                {log.details && <div className="text-xs text-slate-400 mt-1">{log.details}</div>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </GlassCard>
    );
};

export default LiveSessionFeed;
