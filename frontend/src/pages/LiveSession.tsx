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
        <div className="min-h-screen bg-background text-foreground p-6 font-sans">
            {/* Header */}
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Live session monitor</h1>
                    <p className="text-sm text-muted-foreground mt-1">ID: <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded">{safeSessionId}</span></p>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isConnected ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                    <Radio className="w-4 h-4" />
                    <span className="font-medium text-sm">{isConnected ? 'Live' : 'Disconnected'}</span>
                </div>
            </header>

            {/* Performance Overview */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <PerformanceChart data={history} />
                </div>
                <div className="space-y-6">
                    <div className="p-5 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2 text-sm">
                            <TrendingUp className="w-5 h-5" />
                            <span>Current Balance</span>
                        </div>
                        <div className="text-2xl font-semibold">
                            ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="p-5 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2 text-sm">
                            <Activity className="w-5 h-5" />
                            <span>Total PnL</span>
                        </div>
                        <div className={`text-2xl font-semibold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Session Status Overlay */}
            {sessionStatus !== 'ACTIVE' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-background border border-border p-8 rounded-lg text-center max-w-md">
                        <h2 className="text-2xl font-semibold mb-2">Session {sessionStatus === 'PAUSED' ? 'paused' : 'completed'}</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            {sessionStatus === 'PAUSED'
                                ? 'Trading is currently paused correctly. Please wait for the admin to resume.'
                                : 'This trading session has ended. Thank you for participating.'}
                        </p>
                        <button
                            onClick={() => navigate('/user/dashboard')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium transition-colors duration-150 ease-out"
                        >
                            Return to dashboard
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
