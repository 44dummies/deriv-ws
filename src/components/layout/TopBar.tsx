
import React, { useEffect, useState } from 'react';
import { Bell, User, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { GlassButton } from '../ui/glass/GlassButton';
import { tradingApi } from '../../trading/tradingApi';

export const TopBar: React.FC = () => {
    const { user } = useAuth();
    const { activeSession } = useDashboardData();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [serverLatency, setServerLatency] = useState<number | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Simple ping for latency
        const pingInterval = setInterval(async () => {
            const start = Date.now();
            try {
                await tradingApi.getBotStatus();
                setServerLatency(Date.now() - start);
            } catch (e) {
                setServerLatency(null);
            }
        }, 10000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(pingInterval);
        };
    }, []);

    const getStatusColor = () => {
        if (!activeSession) return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        if (activeSession.status === 'running' || activeSession.status === 'live') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    };

    return (
        <header className="h-16 border-b border-white/5 bg-[#0E0E0E]/90 backdrop-blur-md flex items-center justify-between px-6 fixed top-0 left-16 right-0 z-40 transition-all duration-300">
            {/* Left: Session Context */}
            <div className="flex items-center gap-4">
                <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-medium font-mono tracking-wide uppercase ${getStatusColor()}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSession?.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                    {activeSession ? (
                        <span>SESSION: {activeSession.status === 'running' ? 'LIVE' : activeSession.status}</span>
                    ) : (
                        <span>NO ACTIVE SESSION</span>
                    )}
                </div>

                {activeSession && (
                    <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 font-mono border-l border-white/10 pl-4">
                        <span>ID:</span>
                        <span className="text-gray-300">{activeSession.name}</span>
                    </div>
                )}
            </div>

            {/* Right: System Status & Profile */}
            <div className="flex items-center gap-4">
                {/* Latency Indicator */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/5 text-[10px] font-mono text-gray-400">
                    {isOnline ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-red-500" />}
                    <span>{serverLatency ? `${serverLatency}ms` : '--'}</span>
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-red rounded-full border-2 border-[#0E0E0E]"></span>
                </button>

                {/* Vertical Divider */}
                <div className="w-px h-6 bg-white/10 mx-1"></div>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-1">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium text-white leading-none">{user?.fullName || 'Trader'}</div>
                        <div className="text-[10px] text-brand-red font-mono mt-1 opacity-80">{user?.role || 'PRO'}</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-brand-card border border-white/10 flex items-center justify-center overflow-hidden">
                        {user?.profile_photo ? (
                            <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User size={16} className="text-gray-400" />
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
