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
        <div className="p-4 rounded-xl bg-gray-800/40 border border-white/5 hover:border-pink-500/30 transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isCall ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isCall ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-white">{payload.market}</h3>
                        <div className={`text-xs font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${isCall ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {payload.type}
                        </div>
                    </div>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                    {new Date(timestamp).toLocaleTimeString()}
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Confidence</span>
                    </div>
                    <span className="font-mono text-white">{(payload.confidence * 100).toFixed(1)}%</span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${isCall ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${payload.confidence * 100}%` }}
                    />
                </div>

                <div className="flex justify-between items-center text-sm pt-1">
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                        {payload.reason.replace(/_/g, ' ')}
                    </span>
                    {payload.expiry && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Timer className="w-3 h-3" />
                            <span>{new Date(payload.expiry).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
