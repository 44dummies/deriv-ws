import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    { symbol: 'JD_100', name: 'Jump 100 Index', category: 'Jump' },
    { symbol: 'JD_75', name: 'Jump 75 Index', category: 'Jump' },
    { symbol: 'JD_50', name: 'Jump 50 Index', category: 'Jump' },
    { symbol: 'JD_25', name: 'Jump 25 Index', category: 'Jump' },
    { symbol: 'JD_10', name: 'Jump 10 Index', category: 'Jump' },
];

const PRESET_STAKES = [5, 10, 25, 50, 100];
const PRESET_DURATIONS = [1, 3, 5, 10, 15];

export default function ManualTrade({ market: initialMarket, onClose, onTradeExecuted }: ManualTradeProps) {
    const { session, user } = useAuthStore();
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
            const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000'}/api/v1/trades/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Quick Trade</h2>
                            <p className="text-sm text-gray-400 mt-1">Execute a manual trade</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Account Info */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Trading Account</div>
                            <div className="font-mono text-white font-bold mt-1">{activeAccount?.loginid || 'N/A'}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Balance</div>
                            <div className="font-mono text-emerald-400 font-bold mt-1">
                                {activeAccount?.balance?.toFixed(2) || '0.00'} {activeAccount?.currency || 'USD'}
                            </div>
                        </div>
                    </div>

                    {/* Market Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Market</label>
                        <select
                            value={market}
                            onChange={(e) => setMarket(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            {MARKETS.map((m) => (
                                <option key={m.symbol} value={m.symbol} className="bg-gray-900">
                                    {m.name} ({m.symbol})
                                </option>
                            ))}
                        </select>
                        
                        {/* Live Price Display */}
                        <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-gray-500">
                                Category: {selectedMarket?.category}
                            </div>
                            {connected && currentTick ? (
                                <motion.div 
                                    key={currentTick.quote}
                                    initial={{ scale: 1.1 }}
                                    animate={{ scale: 1 }}
                                    className="flex items-center gap-2"
                                >
                                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                                        <Wifi className="w-3 h-3" />
                                        Live
                                    </span>
                                    <span className={cn(
                                        "font-mono font-bold text-sm",
                                        currentTick.trend === 'up' && "text-emerald-400",
                                        currentTick.trend === 'down' && "text-red-400",
                                        currentTick.trend === 'neutral' && "text-white"
                                    )}>
                                        {currentTick.quote.toFixed(2)}
                                        {currentTick.trend === 'up' && <TrendingUp className="w-3 h-3 inline ml-1" />}
                                        {currentTick.trend === 'down' && <TrendingDown className="w-3 h-3 inline ml-1" />}
                                    </span>
                                </motion.div>
                            ) : (
                                <span className="text-xs text-gray-500">Connecting...</span>
                            )}
                        </div>
                    </div>

                    {/* Contract Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Direction</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setContractType('CALL')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all",
                                    contractType === 'CALL'
                                        ? "border-emerald-500 bg-emerald-500/10"
                                        : "border-white/10 hover:border-white/20 bg-white/5"
                                )}
                            >
                                <TrendingUp className={cn(
                                    "w-6 h-6 mx-auto mb-2",
                                    contractType === 'CALL' ? "text-emerald-400" : "text-gray-400"
                                )} />
                                <div className={cn(
                                    "font-bold",
                                    contractType === 'CALL' ? "text-emerald-400" : "text-white"
                                )}>Rise</div>
                                <div className="text-xs text-gray-500 mt-1">Call Option</div>
                            </button>
                            <button
                                onClick={() => setContractType('PUT')}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all",
                                    contractType === 'PUT'
                                        ? "border-red-500 bg-red-500/10"
                                        : "border-white/10 hover:border-white/20 bg-white/5"
                                )}
                            >
                                <TrendingDown className={cn(
                                    "w-6 h-6 mx-auto mb-2",
                                    contractType === 'PUT' ? "text-red-400" : "text-gray-400"
                                )} />
                                <div className={cn(
                                    "font-bold",
                                    contractType === 'PUT' ? "text-red-400" : "text-white"
                                )}>Fall</div>
                                <div className="text-xs text-gray-500 mt-1">Put Option</div>
                            </button>
                        </div>
                    </div>

                    {/* Stake */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Stake Amount</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(Number(e.target.value))}
                                min={1}
                                max={10000}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <span className="text-gray-400">{activeAccount?.currency || 'USD'}</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                            {PRESET_STAKES.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setStake(amount)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                                        stake === amount
                                            ? "bg-blue-500 text-white"
                                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    {amount}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Duration (minutes)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                min={1}
                                max={1440}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <span className="text-gray-400">min</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                            {PRESET_DURATIONS.map((dur) => (
                                <button
                                    key={dur}
                                    onClick={() => setDuration(dur)}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                                        duration === dur
                                            ? "bg-blue-500 text-white"
                                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    {dur}m
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Potential Payout */}
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-400">Potential Payout</span>
                            <span className="text-xl font-bold text-white">{potentialPayout.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Potential Profit</span>
                            <span className="text-lg font-bold text-emerald-400">+{potentialProfit.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Result Message */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={cn(
                                    "p-4 rounded-xl border flex items-start gap-3",
                                    result.success
                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                        : "bg-red-500/10 border-red-500/30"
                                )}
                            >
                                {result.success ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <div className={cn(
                                        "font-bold text-sm",
                                        result.success ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        {result.success ? 'Trade Executed!' : 'Execution Failed'}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">{result.message}</div>
                                    {result.trade && (
                                        <div className="text-xs text-gray-500 mt-2 font-mono">
                                            Contract ID: {result.trade.contract_id}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Execute Button */}
                    <button
                        onClick={handleExecute}
                        disabled={isExecuting || !activeAccount}
                        className={cn(
                            "w-full py-4 rounded-xl font-bold text-white transition-all",
                            "flex items-center justify-center gap-2",
                            isRise
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                                : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
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
            </motion.div>
        </motion.div>
    );
}
