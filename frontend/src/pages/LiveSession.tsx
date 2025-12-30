import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { useRealTimeStore } from '../stores/useRealTimeStore';
import { Activity, Radio, TrendingUp } from 'lucide-react';
import { PerformanceChart } from '../components/charts/PerformanceChart';
import { SignalsFeed } from '../components/live-session/feeds/SignalsFeed';
import { TradesFeed } from '../components/live-session/feeds/TradesFeed';
import { RiskFeed } from '../components/live-session/feeds/RiskFeed';

export default function LiveSession() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const safeSessionId = sessionId || 'unknown-session';

    // Activate real-time data subscription
    useRealTimeData(safeSessionId);

    // Selectors for performance - only re-render on specific changes
    const isConnected = useRealTimeStore((state) => state.isConnected);
    const sessionStatus = useRealTimeStore((state) => state.sessionStatus);
    const history = useRealTimeStore((state) => state.history);
    const currentBalance = useRealTimeStore((state) => state.currentBalance);
    const totalPnL = useRealTimeStore(state => state.totalPnL);
    const pruneExpiredData = useRealTimeStore(state => state.pruneExpiredData);

    // Setup cleanup interval
    useEffect(() => {
        const interval = setInterval(() => {
            pruneExpiredData();
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [pruneExpiredData]);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
            {/* Header */}
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-400">
                        Live Session Monitor
                    </h1>
                    <p className="text-gray-400 mt-1">ID: <span className="font-mono text-sm bg-gray-800 px-2 py-1 rounded">{safeSessionId}</span></p>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    <Radio className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
                    <span className="font-medium text-sm">{isConnected ? 'Live' : 'Disconnected'}</span>
                </div>
            </header>

            {/* Performance Overview */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <PerformanceChart data={history} />
                </div>
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <TrendingUp className="w-5 h-5" />
                            <span>Current Balance</span>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Activity className="w-5 h-5" />
                            <span>Total PnL</span>
                        </div>
                        <div className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Session Status Overlay */}
            {sessionStatus !== 'ACTIVE' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-white/10 p-8 rounded-2xl text-center max-w-md shadow-2xl">
                        <h2 className="text-3xl font-bold text-white mb-2">Session {sessionStatus === 'PAUSED' ? 'Paused' : 'Completed'}</h2>
                        <p className="text-gray-400 mb-6">
                            {sessionStatus === 'PAUSED'
                                ? 'Trading is currently paused correctly. Please wait for the admin to resume.'
                                : 'This trading session has ended. Thank you for participating.'}
                        </p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}

            {/* Grid Layout */}
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-100px)]">

                {/* Signals Column */}
                <SignalsFeed />

                {/* Risk Events Column */}
                <RiskFeed />

                {/* Executed Trades Column */}
                <TradesFeed />

            </div>
        </div>
    );
}
