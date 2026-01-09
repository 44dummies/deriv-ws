import { useState, useEffect } from 'react';
import { Terminal, RefreshCw } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';

interface LogEntry {
    id: number;
    timestamp: string;
    level: string;
    message: string;
}

export default function AdminLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isAutoRefresh, setIsAutoRefresh] = useState(true);

    const fetchLogs = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/v1/stats/logs`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch {
            // Log fetch failed - handled silently to avoid console noise
        }
    };

    useEffect(() => {
        fetchLogs();
        if (!isAutoRefresh) return;
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, [isAutoRefresh]);

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'INFO': return 'text-blue-400';
            case 'WARN': return 'text-yellow-400';
            case 'ERROR': return 'text-red-500';
            case 'SUCCESS': return 'text-green-400';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <header className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Terminal className="h-6 w-6 text-slate-400" />
                        Quant Engine Logs
                    </h1>
                    <p className="text-slate-500 text-sm">Real-time execution trace from the RiskGuard engine.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-colors ${isAutoRefresh ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-white/10 text-slate-400'}`}
                    >
                        <RefreshCw className={`h-3 w-3 ${isAutoRefresh ? 'animate-spin' : ''}`} />
                        {isAutoRefresh ? 'LIVE' : 'PAUSED'}
                    </button>
                </div>
            </header>

            <GlassCard className="flex-1 overflow-hidden flex flex-col font-mono text-sm bg-black/80 border-white/5">
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-3 hover:bg-white/5 p-0.5 rounded px-2 transition-colors">
                            <span className="text-slate-600 shrink-0 select-none">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`font-bold shrink-0 w-16 ${getLevelColor(log.level)}`}>
                                {log.level}
                            </span>
                            <span className="text-slate-300 break-all">
                                {log.message}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-slate-600 italic text-center mt-10">Waiting for logs...</div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-2 border-t border-white/10 bg-white/5 text-xs text-slate-500 flex justify-between">
                    <span>Buffer: {logs.length} lines</span>
                    <span>Server: api-gateway-01</span>
                </div>
            </GlassCard>
        </div>
    );
}
