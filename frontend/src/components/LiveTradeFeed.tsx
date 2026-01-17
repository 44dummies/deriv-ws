import { useEffect, useRef } from 'react';
import { useRealTimeStore, LogEntry } from '../stores/useRealTimeStore';
import { cn } from '../lib/utils';

export function LiveTradeFeed() {
    const logs = useRealTimeStore(s => s.logs);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new logs
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'SUCCESS': return 'text-green-400';
            case 'ERROR': return 'text-red-400';
            case 'WARNING': return 'text-yellow-400';
            case 'INFO': return 'text-blue-300';
            default: return 'text-gray-300';
        }
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    if (logs.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic border rounded-xl bg-card p-8">
                Waiting for trading activity...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="p-3 border-b bg-muted/40 flex justify-between items-center">
                <h3 className="text-sm font-semibold tracking-tight">Live Activity Feed</h3>
                <span className="text-[10px] uppercase font-mono text-muted-foreground">Real-time</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-black/90 font-mono text-xs space-y-1.5 min-h-[300px] max-h-[400px]">
                {logs.slice().reverse().map((log) => (
                    <div key={log.id} className="flex gap-3">
                        <span className="text-gray-500 flex-shrink-0 select-none">
                            [{formatTime(log.timestamp)}]
                        </span>
                        <span className={cn("break-all", getLogColor(log.type))}>
                            {log.message}
                        </span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
