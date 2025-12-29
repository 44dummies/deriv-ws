import { useRealTimeStore } from '../../../stores/useRealTimeStore';
import { FeedList } from '../FeedList';
import { SignalDetailCard } from '../SignalDetailCard';
import { Zap } from 'lucide-react';

export function SignalsFeed() {
    const signals = useRealTimeStore((state) => state.signals);

    return (
        <FeedList
            title="Signals Generated"
            icon={Zap}
            iconColor="text-pink-400"
            isEmpty={signals.length === 0}
        >
            {signals.map((sig, idx) => (
                <SignalDetailCard key={`${sig.timestamp}-${idx}`} signal={sig} />
            ))}
        </FeedList>
    );
}
