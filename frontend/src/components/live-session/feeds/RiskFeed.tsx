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
                <div
                    key={`${evt.timestamp}-${idx}`}
                    className={`p-4 rounded-md border ${evt.payload.checkPassed ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        {evt.payload.checkPassed ? (
                            <ShieldCheck className="w-4 h-4 text-primary" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span className="font-medium text-foreground">
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
