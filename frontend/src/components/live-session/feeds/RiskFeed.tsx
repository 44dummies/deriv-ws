import { useRealTimeStore } from '../../../stores/useRealTimeStore';
import { FeedList } from '../FeedList';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export function RiskFeed() {
    const riskEvents = useRealTimeStore((state) => state.riskEvents);

    return (
        <FeedList
            title="Risk Checks"
            icon={ShieldCheck}
            iconColor="text-primary"
            isEmpty={riskEvents.length === 0}
        >
            {riskEvents.map((evt, idx) => (
                <div key={`${evt.timestamp}-${idx}`} className={`p-4 rounded-md border ${evt.payload.checkPassed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        {evt.payload.checkPassed ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-medium ${evt.payload.checkPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                            {evt.payload.checkPassed ? 'Approved' : 'Rejected'}
                        </span>
                    </div>
                    {evt.payload.reason && (
                        <p className="text-sm text-muted-foreground mt-2">{evt.payload.reason}</p>
                    )}
                    <div className="text-right mt-2">
                        <span className="text-xs text-muted-foreground">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            ))}
        </FeedList>
    );
}
