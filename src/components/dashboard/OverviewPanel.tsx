
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../../hooks/useDashboardData';
import { StatsOverview } from './StatsOverview';
import { SessionCard } from './SessionCard';
import { GlassCard } from '../ui/glass/GlassCard';
import { GlassButton } from '../ui/glass/GlassButton';
import { Play, Zap, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { tradingApi } from '../../trading/tradingApi';
import { CONFIG } from '../../config/constants';
import { TradingLoader } from '../ui/TradingLoader';

export const OverviewPanel: React.FC = () => {
    const { isLoading, userInfo, sessions, activeSession, refresh, stats } = useDashboardData();
    const navigate = useNavigate();

    // Determine account status
    const accountType = userInfo?.is_virtual ? 'Demo' : 'Real';
    const balance = userInfo?.is_virtual ? userInfo.demo_balance : userInfo?.real_balance;

    const handleJoinSession = async (sessionId: string) => {
        try {
            await tradingApi.acceptSession({
                sessionId,
                accountId: userInfo?.id,
                takeProfit: CONFIG.TRADING.DEFAULT_TP,
                stopLoss: CONFIG.TRADING.DEFAULT_SL
            });
            toast.success('Joined session successfully!');
            navigate('/user/dashboard?tab=trading');
        } catch (error) {
            console.error('Failed to join:', error);
            toast.error('Failed to join session');
        }
    };

    const handleResumeSession = () => {
        navigate('/user/dashboard?tab=trading');
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <TradingLoader />
            </div>
        );
    }



    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header / Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        Hello, <span className="text-brand-red">{userInfo?.fullname || 'Trader'}</span>
                    </h1>
                    <p className="text-sm md:text-base text-gray-400 mt-1">
                        Here's what's happening with your portfolio today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <GlassButton size="sm" variant="ghost" onClick={refresh}>
                        <RefreshCw size={18} />
                    </GlassButton>
                    <GlassButton
                        size="sm"
                        variant="primary"
                        onClick={() => navigate('/user/dashboard?tab=trading')}
                    >
                        <Zap size={18} className="mr-2" /> Live Trading
                    </GlassButton>
                </div>
            </div>

            {/* Stats */}
            <StatsOverview
                realBalance={userInfo?.real_balance}
                demoBalance={userInfo?.demo_balance}
                // balance={balance || 0} // removed legacy prop
                currency={userInfo?.currency || 'USD'}
                todayPnL={stats?.todayPnL || 0}
                winRate={stats?.winRate || 0}
                totalTrades={stats?.totalTrades || 0}
                accountType={accountType}
                lastTradeTime={stats?.lastTradeTime}
            />

            {/* Active Session Banner */}
            {activeSession && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Active Session
                    </h2>
                    <GlassCard
                        className="border-green-500/30 bg-green-500/5 relative overflow-hidden group cursor-pointer"
                        onClick={handleResumeSession}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-50 text-9xl font-bold text-green-500/5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                            LIVE
                        </div>
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-green-500/20 text-green-400 animate-pulse-subtle">
                                    <Play fill="currentColor" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{activeSession.name}</h3>
                                    <p className="text-sm text-green-300">Session in progress • Click to resume</p>
                                </div>
                            </div>
                            <GlassButton variant="success" size="sm" onClick={handleResumeSession}>
                                Resume
                            </GlassButton>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Available Sessions */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Available Sessions</h2>
                </div>

                {sessions.length === 0 ? (
                    <GlassCard className="text-center py-12 border-dashed border-white/10">
                        <p className="text-gray-500">No active sessions available at the moment.</p>
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map(session => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                onJoin={handleJoinSession}
                                isActive={activeSession && activeSession.id === session.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Tips / News */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4">Market Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassCard className="hover:border-blue-500/30 transition-colors cursor-pointer">
                        <span className="text-xs font-bold text-blue-400 mb-2 block">TIP OF THE DAY</span>
                        <p className="text-white font-medium">Use the "Stats" tab to analyze your win rate by hour to optimize your trading schedule.</p>
                    </GlassCard>
                    <GlassCard className="hover:border-purple-500/30 transition-colors cursor-pointer">
                        <span className="text-xs font-bold text-purple-400 mb-2 block">COMMUNITY</span>
                        <p className="text-white font-medium">Join the "Forex Masters" room to discuss the latest EUR/USD volatility trends.</p>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
