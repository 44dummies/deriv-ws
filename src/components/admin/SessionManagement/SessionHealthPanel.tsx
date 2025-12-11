
import React, { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff, AlertTriangle, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import { ManagedSession, SessionHealth } from '../../../types/session';

interface SessionHealthPanelProps {
    session: ManagedSession;
    isDark?: boolean;
}

export const SessionHealthPanel: React.FC<SessionHealthPanelProps> = ({ session, isDark = true }) => {
    const [now, setNow] = useState(Date.now());
    const health = session.health;

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!health) {
        return (
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-gray-200'} text-center`}>
                <p className="text-slate-500">Initializing Health Monitor...</p>
            </div>
        );
    }

    const getRelativeTime = (timestamp: number) => {
        const diff = Math.floor((now - timestamp) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    const getStatusColor = (status: SessionHealth['status']) => {
        switch (status) {
            case 'active': return 'text-emerald-400';
            case 'idle': return 'text-blue-400';
            case 'stalled': return 'text-orange-400';
            case 'error': return 'text-red-400';
            case 'disconnected': return 'text-slate-400';
            default: return 'text-slate-400';
        }
    };

    const StatusDot = ({ active, label }: { active: boolean, label: string }) => (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} />
            <span className={`text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
        </div>
    );

    return (
        <div className={`rounded-xl border ${isDark ? 'bg-[#0F1115] border-slate-700' : 'bg-white border-gray-200'} p-4`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${getStatusColor(health.status)}`} />
                    System Health
                </h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full border ${health.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        health.status === 'stalled' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                            health.status === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                'bg-slate-500/10 border-slate-500/30 text-slate-400'
                    }`}>
                    {health.status.toUpperCase()}
                </span>
            </div>

            {/* Stream Indicators */}
            <div className={`grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                <div className="flex flex-col items-center gap-1">
                    <Wifi className={`w-4 h-4 ${health.isWebsocketAlive ? 'text-emerald-400' : 'text-red-400'}`} />
                    <span className="text-[10px] text-slate-400">WebSocket</span>
                    <span className="text-[10px] font-mono text-slate-500">{getRelativeTime(health.lastHeartbeat)}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <Activity className={`w-4 h-4 ${health.isContractStreamAlive ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className="text-[10px] text-slate-400">Contract</span>
                    <span className="text-[10px] font-mono text-slate-500">{health.currentContractId ? 'Active' : 'Idle'}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <RefreshCw className={`w-4 h-4 ${health.isBalanceStreamAlive ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className="text-[10px] text-slate-400">Balance</span>
                    <span className="text-[10px] font-mono text-slate-500">{getRelativeTime(health.lastBalanceUpdate)}</span>
                </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Last Trade
                    </span>
                    <span className="font-mono text-slate-300">{getRelativeTime(health.lastTradeTime)}</span>
                </div>

                {health.currentContractId && (
                    <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-blue-400">Active Contract</span>
                            <span className="text-blue-300 font-mono">{health.currentContractId}</span>
                        </div>
                        <div className="w-full bg-blue-900/30 h-1 rounded overflow-hidden">
                            <div className="h-full bg-blue-500 animate-pulse w-full" />
                        </div>
                    </div>
                )}
            </div>

            {/* Warnings */}
            {health.warnings.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-700/50">
                    <h4 className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Warnings
                    </h4>
                    <div className="space-y-1">
                        {health.warnings.map((w, i) => (
                            <div key={i} className="text-xs text-orange-300/80 bg-orange-500/5 px-2 py-1 rounded border border-orange-500/10">
                                {w}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
