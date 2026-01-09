import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, X, Loader2, AlertTriangle, CheckCircle2, Wifi } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
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
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const response = await fetch(`${baseUrl}/api/v1/trades/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    market,
                    contractType,
                    stake,
                    duration,
                    durationUnit: 'm'
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setResult({ success: true, message: data.message, trade: data.trade });
                if (onTradeExecuted) {
                    onTradeExecuted(data.trade);
                }
            } else {
                setResult({ success: false, message: data.error || 'Trade execution failed' });
            }
        } catch (error) {
            setResult({ success: false, message: error instanceof Error ? error.message : 'Network error' });
        } finally {
            setIsExecuting(false);
        }
    };

    const selectedMarket = MARKETS.find(m => m.symbol === market);
    const isRise = contractType === 'CALL' || contractType === 'DIGITOVER';
    const potentialPayout = stake * 1.95; // Example payout (varies by market)
    const potentialProfit = potentialPayout - stake;

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
                            <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">
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
                                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                        <Wifi className="w-3 h-3" />
                                        Live
                                    </span>
                                    <span className={cn(
                                        "font-mono font-bold text-sm flex items-center",
                                        currentTick?.trend === 'up' && "text-emerald-600 dark:text-emerald-400",
                                        currentTick?.trend === 'down' && "text-red-600 dark:text-red-400"
                                    )}>
                                        {currentTick?.quote.toFixed(2)}
                                        {currentTick?.trend === 'up' && <TrendingUp className="w-3 h-3 ml-1" />}
                                        {currentTick?.trend === 'down' && <TrendingDown className="w-3 h-3 ml-1" />}
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
                                    "p-4 rounded-xl border-2 transition-all",
                                    contractType === 'CALL'
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                                        : "border-muted hover:border-emerald-200 dark:hover:border-emerald-900 bg-background"
                                )}
                            >
                                <TrendingUp className={cn(
                                    "w-6 h-6 mx-auto mb-2",
                                    contractType === 'CALL' ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                )} />
                                <div className={cn(
                                    "font-bold",
                                    contractType === 'CALL' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                )}>Rise</div>
                                <div className="text-xs text-muted-foreground mt-1">Call Option</div>
                            </button>
                            <button
                                onClick={() => setContractType('PUT')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all",
                                    contractType === 'PUT'
                                        ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                                        : "border-muted hover:border-red-200 dark:hover:border-red-900 bg-background"
                                )}
                            >
                                <TrendingDown className={cn(
                                    "w-6 h-6 mx-auto mb-2",
                                    contractType === 'PUT' ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                                )} />
                                <div className={cn(
                                    "font-bold",
                                    contractType === 'PUT' ? "text-red-600 dark:text-red-400" : "text-foreground"
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

                    {/* Potential Payout */}
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Potential Payout</span>
                            <span className="text-xl font-bold">{potentialPayout.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Potential Profit</span>
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{potentialProfit.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Result Message */}
                    {result && (
                        <div className={cn(
                            "p-4 rounded-xl border flex items-start gap-3",
                            result.success
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                        )}>
                            {result.success ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <div className={cn(
                                    "font-bold text-sm",
                                    result.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {result.success ? 'Trade Executed!' : 'Execution Failed'}
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
                        className={cn(
                            "w-full py-4 rounded-xl font-bold text-white transition-colors duration-150 ease-out",
                            "flex items-center justify-center gap-2",
                            isRise
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-red-600 hover:bg-red-700",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
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
