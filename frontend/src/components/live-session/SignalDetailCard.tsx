import { WSDetail, SignalPayload } from '../../stores/useRealTimeStore';
import { ArrowUpCircle, ArrowDownCircle, Timer, Zap } from 'lucide-react';

interface SignalDetailCardProps {
    signal: WSDetail<SignalPayload>;
}

export function SignalDetailCard({ signal }: SignalDetailCardProps) {
    const { payload, timestamp } = signal;

    // Check if type matches expected 'CALL' or 'PUT' or try to infer
    // For safety, handle generic strings if backend sends something else unexpectedly, though we typed it.
    const isCall = payload.type === 'CALL';

    return (
        <div className="p-4 rounded-md bg-card border border-border hover:border-primary/30 transition-colors duration-150 ease-out group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${isCall ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isCall ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{payload.market}</h3>
                        <div className={`text-xs font-semibold px-1.5 py-0.5 rounded inline-block mt-1 ${isCall ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {payload.type}
                        </div>
                    </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                    {new Date(timestamp).toLocaleTimeString()}
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Confidence</span>
                    </div>
                    <span className="font-mono text-foreground">{(payload.confidence * 100).toFixed(1)}%</span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full ${isCall ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${payload.confidence * 100}%` }}
                    />
                </div>

                <div className="flex justify-between items-center text-sm pt-1">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        {payload.reason.replace(/_/g, ' ')}
                    </span>
                    {payload.expiry && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Timer className="w-3 h-3" />
                            <span>{new Date(payload.expiry).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
