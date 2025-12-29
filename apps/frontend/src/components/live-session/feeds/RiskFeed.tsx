import { useRealTimeStore } from '../../../stores/useRealTimeStore';
import { FeedList } from '../FeedList';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export function RiskFeed() {
    const riskEvents = useRealTimeStore((state) => state.riskEvents);

    return (
        <FeedList
            title="Risk Checks"
            icon={ShieldCheck}
            iconColor="text-yellow-400"
            isEmpty={riskEvents.length === 0}
        >
            {riskEvents.map((evt, idx) => (
                <div key={`${evt.timestamp}-${idx}`} className={`p-4 rounded-xl border border-white/5 ${evt.payload.checkPassed ? 'bg-green-900/10 border-green-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        {evt.payload.checkPassed ? (
                            <ShieldCheck className="w-4 h-4 text-green-400" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`font-medium ${evt.payload.checkPassed ? 'text-green-400' : 'text-red-400'}`}>
                            {evt.payload.checkPassed ? 'Approved' : 'Rejected'}
                        </span>
                    </div>
                    {evt.payload.reason && (
                        <p className="text-sm text-gray-300 mt-2">{evt.payload.reason}</p>
                    )}
                    <div className="text-right mt-2">
                        <span className="text-xs text-gray-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            ))}
        </FeedList>
    );
}
