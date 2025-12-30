import { useRealTimeStore } from '../../../stores/useRealTimeStore';
import { FeedList } from '../FeedList';
import { TradeDetailCard } from '../TradeDetailCard';
import { Activity } from 'lucide-react';

export function TradesFeed() {
    const trades = useRealTimeStore((state) => state.trades);

    return (
        <FeedList
            title="Executed Trades"
            icon={Activity}
            iconColor="text-blue-400"
            isEmpty={trades.length === 0}
        >
            {trades.map((trade, idx) => (
                <TradeDetailCard key={trade.payload.tradeId || `${trade.timestamp}-${idx}`} trade={trade} />
            ))}
        </FeedList>
    );
}
