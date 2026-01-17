import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, X, Loader2, AlertTriangle, CheckCircle2, Wifi } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/useAuthStore';
import { fetchWithAuth } from '../lib/api';
import { useDerivTicks } from '../hooks/useDerivTicks';

interface ManualTradeProps {
    market?: string;
    onClose?: () => void;
    onTradeExecuted?: (trade: any) => void;
}

type ContractType = 'CALL' | 'PUT' | 'DIGITOVER' | 'DIGITUNDER';

// Supported Markets - Jump and Volatility Indices ONLY
const MARKETS = [
    // Volatility Indices
    { symbol: 'R_100', name: 'Volatility 100 Index', category: 'Volatility' },
    { symbol: 'R_75', name: 'Volatility 75 Index', category: 'Volatility' },
    { symbol: 'R_50', name: 'Volatility 50 Index', category: 'Volatility' },
    { symbol: 'R_25', name: 'Volatility 25 Index', category: 'Volatility' },
    { symbol: 'R_10', name: 'Volatility 10 Index', category: 'Volatility' },
    // Jump Indices
    { symbol: 'JD100', name: 'Jump 100 Index', category: 'Jump' },
    { symbol: 'JD75', name: 'Jump 75 Index', category: 'Jump' },
    { symbol: 'JD50', name: 'Jump 50 Index', category: 'Jump' },
    { symbol: 'JD25', name: 'Jump 25 Index', category: 'Jump' },
    { symbol: 'JD10', name: 'Jump 10 Index', category: 'Jump' },
];

const PRESET_STAKES = [5, 10, 25, 50, 100];
const PRESET_DURATIONS = [1, 3, 5, 10, 15];

export default function ManualTrade({ market: initialMarket, onClose, onTradeExecuted }: ManualTradeProps) {
    const { user } = useAuthStore();
    const [market, setMarket] = useState(initialMarket || 'R_100');
    const [contractType, setContractType] = useState<ContractType>('CALL');
    const [stake, setStake] = useState(10);
    const [duration, setDuration] = useState(3);
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; trade?: any } | null>(null);

    const activeAccount = user?.deriv_accounts?.find(a => a.loginid === user?.active_account_id);

    // Get all market symbols for live ticks
    const marketSymbols = useMemo(() => MARKETS.map(m => m.symbol), []);
    const { ticks, connected } = useDerivTicks({ symbols: marketSymbols });

    // Get current market tick
    const currentTick = ticks.get(market);

    const handleExecute = async () => {
        setIsExecuting(true);
        setResult(null);

        try {
            const data = await fetchWithAuth('/trades/execute', {
                method: 'POST',
                body: JSON.stringify({
                    market,
                    contractType,
                    stake,
                    duration,
                    durationUnit: 'm'
                })
            });

            if (data?.success) {
                setResult({ success: true, message: data.message, trade: data.trade });
                if (onTradeExecuted) {
                    onTradeExecuted(data.trade);
                }
                // Refresh balance immediately
                useAuthStore.getState().initialize();
            } else {
                setResult({ success: false, message: data?.error || 'Trade execution failed' });
            }
        } catch (error: any) {
            console.error('Trade failed:', error);
            // Extract message from error object or string
            // api.ts throws "API Error: Status - Body"
            // We want to show a clean message to the user
            let message = 'Failed to execute trade';

            if (error.message) {
                // Try to parse JSON from the error message if it contains it
                // e.g. "API Error: Forbidden - {"error":"Risk blocked","reason":"..."}"
                const match = error.message.match(/{.*}/);
                if (match) {
                    try {
                        const json = JSON.parse(match[0]);
                        message = json.reason || json.error || json.details || message;
                    } catch {
                        message = error.message; // Fallback
                    }
                } else {
                    message = error.message.replace('API Error: ', '');
                }
            }

            toast.error(message);
        } finally {
            setIsExecuting(false);
        }
    };

    const selectedMarket = MARKETS.find(m => m.symbol === market);
    const isRise = contractType === 'CALL' || contractType === 'DIGITOVER';

    // Estimated payout before execution (approx 1.95x for synthetics)
    // After execution, we show actual payout from Deriv
    const estimatedPayout = stake * 1.95;
    const estimatedProfit = estimatedPayout - stake;

    // Actual payout from trade result (if executed)
    const actualPayout = result?.trade?.payout;
    const actualBuyPrice = result?.trade?.buy_price;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div
                className="w-full max-w-lg rounded-xl border bg-card text-card-foreground overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="border-b p-6 bg-muted/40">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Quick Trade</h2>
                            <p className="text-sm text-muted-foreground mt-1">Execute a manual trade</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Account Info */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                        <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Trading Account</div>
                            <div className="font-mono font-bold mt-1">{activeAccount?.loginid || 'N/A'}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Balance</div>
                            <div className="font-mono text-foreground font-semibold mt-1 tabular-nums">
                                {activeAccount?.balance?.toFixed(2) || '0.00'} {activeAccount?.currency || 'USD'}
                            </div>
                        </div>
                    </div>

                    {/* Market Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Market</label>
                        <select
                            value={market}
                            onChange={(e) => setMarket(e.target.value)}
                            className="w-full bg-background border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            {MARKETS.map((m) => (
                                <option key={m.symbol} value={m.symbol}>
                                    {m.name} ({m.symbol})
                                </option>
                            ))}
                        </select>

                        {/* Live Price Display */}
                        <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-muted-foreground">
                                Category: {selectedMarket?.category}
                            </div>
                            {connected && currentTick ? (
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-xs text-primary">
                                        <Wifi className="w-3 h-3" />
                                        Live
                                    </span>
                                    <span className={cn(
                                        "font-mono font-semibold text-sm flex items-center tabular-nums text-foreground"
                                    )}>
                                        {currentTick?.quote.toFixed(2)}
                                        {currentTick?.trend === 'up' && <TrendingUp className="w-3 h-3 ml-1 text-muted-foreground" />}
                                        {currentTick?.trend === 'down' && <TrendingDown className="w-3 h-3 ml-1 text-muted-foreground" />}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground">Connecting...</span>
                            )}
                        </div>
                    </div>

                    {/* Contract Type */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Direction</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setContractType('CALL')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-colors duration-150 ease-out",
                                    contractType === 'CALL'
                                        ? "border-primary/40 bg-primary/5"
                                        : "border-border hover:border-primary/20 bg-background"
                                )}
                            >
                                <TrendingUp className={cn(
                                    "w-6 h-6 mx-auto mb-2",
                                    contractType === 'CALL' ? "text-primary" : "text-muted-foreground"
                                )} />
                                <div className={cn(
                                    "font-semibold",
                                    contractType === 'CALL' ? "text-foreground" : "text-foreground"
                                )}>Rise</div>
                                <div className="text-xs text-muted-foreground mt-1">Call Option</div>
                            </button>
                            <button
                                onClick={() => setContractType('PUT')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-colors duration-150 ease-out",
                                    contractType === 'PUT'
                                        ? "border-primary/40 bg-primary/5"
                                        : "border-border hover:border-primary/20 bg-background"
                                )}
                            >
                                <TrendingDown className={cn(
                                    "w-6 h-6 mx-auto mb-2",
                                    contractType === 'PUT' ? "text-primary" : "text-muted-foreground"
                                )} />
                                <div className={cn(
                                    "font-semibold",
                                    contractType === 'PUT' ? "text-foreground" : "text-foreground"
                                )}>Fall</div>
                                <div className="text-xs text-muted-foreground mt-1">Put Option</div>
                            </button>
                        </div>
                    </div>

                    {/* Stake */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Stake Amount</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(Number(e.target.value))}
                                min={1}
                                max={10000}
                                className="flex-1 bg-background border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <span className="text-muted-foreground font-medium">{activeAccount?.currency || 'USD'}</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                            {PRESET_STAKES.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setStake(amount)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-medium transition-colors border",
                                        stake === amount
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background hover:bg-muted text-muted-foreground"
                                    )}
                                >
                                    {amount}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                min={1}
                                max={1440}
                                className="flex-1 bg-background border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                            <span className="text-muted-foreground font-medium">min</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                            {PRESET_DURATIONS.map((dur) => (
                                <button
                                    key={dur}
                                    onClick={() => setDuration(dur)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-medium transition-colors border",
                                        duration === dur
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background hover:bg-muted text-muted-foreground"
                                    )}
                                >
                                    {dur}m
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payout Display */}
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                        {result?.success && actualPayout ? (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-muted-foreground">Actual payout</span>
                                    <span className="text-xl font-semibold tabular-nums text-primary">{actualPayout.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Buy price</span>
                                    <span className="text-lg font-semibold tabular-nums">{actualBuyPrice?.toFixed(2) || stake.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-sm text-muted-foreground">Potential profit</span>
                                    <span className="text-base font-semibold text-green-500 tabular-nums">+{(actualPayout - (actualBuyPrice || stake)).toFixed(2)}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-muted-foreground">Estimated payout</span>
                                    <span className="text-xl font-semibold tabular-nums">{estimatedPayout.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Estimated profit</span>
                                    <span className="text-lg font-semibold text-muted-foreground tabular-nums">~+{estimatedProfit.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground/70 mt-2 text-center">
                                    Actual payout shown after execution
                                </div>
                            </>
                        )}
                    </div>

                    {/* Result Message */}
                    {result && (
                        <div className={cn(
                            "p-4 rounded-xl border flex items-start gap-3",
                            result.success
                                ? "bg-primary/5 border-primary/20"
                                : "bg-destructive/5 border-destructive/20"
                        )}>
                            {result.success ? (
                                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <div className="font-semibold text-sm text-foreground">
                                    {result.success ? 'Trade executed' : 'Execution failed'}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{result.message}</div>
                                {result.trade && (
                                    <div className="text-xs text-muted-foreground mt-2 font-mono">
                                        Contract ID: {result.trade.contract_id}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Execute Button */}
                    <button
                        onClick={handleExecute}
                        disabled={isExecuting || !activeAccount}
                        className="w-full py-4 rounded-xl font-semibold bg-primary text-primary-foreground transition-colors duration-150 ease-out hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isExecuting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Executing...
                            </>
                        ) : (
                            <>
                                {isRise ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                Buy {isRise ? 'Rise' : 'Fall'} for {stake} {activeAccount?.currency || 'USD'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
