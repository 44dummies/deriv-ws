import { WSDetail, TradePayload } from '../../stores/useRealTimeStore';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface TradeDetailCardProps {
    trade: WSDetail<TradePayload>;
}

export function TradeDetailCard({ trade }: TradeDetailCardProps) {
    const { payload, timestamp } = trade;
    const [expanded, setExpanded] = useState(false);

    const isProfit = payload.profit >= 0;
    const statusColor = {
        SUCCESS: 'text-primary bg-primary/10 border-primary/20',
        FAILED: 'text-destructive bg-destructive/10 border-destructive/20',
        PARTIAL: 'text-muted-foreground bg-muted/50 border-border'
    }[payload.status];

    const Icon = {
        SUCCESS: CheckCircle2,
        FAILED: XCircle,
        PARTIAL: AlertTriangle
    }[payload.status];

    return (
        <div className="rounded-md bg-card border border-border overflow-hidden transition-colors duration-150 ease-out hover:border-primary/30">
            <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${statusColor}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                            {payload.metadata_json.market}
                            <span className="text-xs font-normal text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                {payload.tradeId.slice(-6)}
                            </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {new Date(payload.executedAt || timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                <div className="text-right flex flex-col items-end">
                    <div className={`font-mono font-semibold ${isProfit ? 'text-primary' : 'text-muted-foreground'}`}>
                        {payload.profit > 0 ? '+' : ''}{payload.profit.toFixed(2)} USD
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase mt-1">
                        {payload.status}
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground border-t border-border bg-muted/30">
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-muted-foreground">Entry Price</span>
                            <span className="font-mono text-foreground">
                                {payload.metadata_json.entryPrice ? payload.metadata_json.entryPrice.toFixed(4) : 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-muted-foreground">Confidence</span>
                            <span>
                                {payload.metadata_json.risk_confidence ? (payload.metadata_json.risk_confidence * 100).toFixed(1) + '%' : 'N/A'}
                            </span>
                        </div>
                        {payload.metadata_json.reason && (
                            <div className="col-span-2 mt-2">
                                <span className="block text-xs uppercase tracking-wider text-muted-foreground">Note</span>
                                <span className="text-muted-foreground">{payload.metadata_json.reason}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
