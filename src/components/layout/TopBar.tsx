import React, { useEffect, useState } from 'react';
import { Bell, User, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { TokenService } from '../../services/tokenService';
import { GlassButton } from '../ui/glass/GlassButton';
import { tradingApi } from '../../trading/tradingApi';
import { CONFIG } from '../../config/constants';

export const TopBar: React.FC = () => {
    const { user } = useAuth();
    const { activeSession, isOnline, serverLatency, setServerLatency, userInfo } = useDashboardData();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // Use balance from userInfo
    const displayBalance = userInfo?.is_virtual ?
        `${userInfo.currency} ${userInfo.balance}` :
        (userInfo?.demo_balance !== undefined && userInfo?.demo_balance !== null ? `USD ${userInfo.demo_balance}` : null);

    // Simple ping for latency
    useEffect(() => {
        const pingInterval = setInterval(async () => {
            const start = Date.now();
            try {
                await tradingApi.getBotStatus();
                setServerLatency(Date.now() - start);
            } catch (e) {
                setServerLatency(null);
            }
        }, CONFIG.UI.PING_INTERVAL);

        return () => clearInterval(pingInterval);
    }, [setServerLatency]);

    const getFirstName = (fullName: string | undefined) => {
        if (!fullName) return 'Trader';
        return fullName.split(' ')[0];
    };

    const handleNotificationClick = () => {
        // Placeholder for notification logic
        alert('No new notifications');
    };

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
                {/* Balance Display (Demo) */}
                {displayBalance && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                        <span>DEMO:</span>
                        <span className="font-bold text-emerald-300">{displayBalance}</span>
                    </div>
                )}

                {/* Latency Indicator */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/5 text-[10px] font-mono text-gray-400">
                    {isOnline ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-red-500" />}
                    <span>{serverLatency ? `${serverLatency}ms` : '--'}</span>
                </div>

                {/* Notifications */}
                <button
                    onClick={handleNotificationClick}
                    className="relative p-2 text-gray-400 hover:text-white transition-colors"
                >
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-red rounded-full border-2 border-[#0E0E0E]"></span>
                </button>

                {/* Vertical Divider */}
                <div className="w-px h-6 bg-white/10 mx-1"></div>

                {/* User Profile */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-3 pl-1 hover:bg-white/5 p-1.5 rounded-lg transition-colors text-left"
                    >
                        <div className="hidden sm:block">
                            <div className="text-sm font-medium text-white leading-none">{getFirstName(userInfo?.fullname)}</div>
                            <div className="text-[10px] text-brand-red font-mono mt-1 opacity-80">{user?.role || 'PRO'}</div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-brand-card border border-white/10 flex items-center justify-center overflow-hidden">
                            {user?.profile_photo ? (
                                <img src={user.profile_photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} className="text-gray-400" />
                            )}
                        </div>
                    </button>

                    {/* Profile Dropdown */}
                    {showProfileMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowProfileMenu(false)}
                            ></div>
                            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1E1E1E] border border-white/10 rounded-xl shadow-2xl p-4 z-50 flex flex-col gap-3">
                                <div className="pb-3 border-b border-white/10">
                                    <p className="text-xs text-gray-500 uppercase font-mono mb-1">Account</p>
                                    <p className="text-white font-medium">{userInfo?.fullname || 'Trader'}</p>
                                    <p className="text-xs text-gray-400 truncate">{userInfo?.email || user?.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-mono mb-1">Deriv ID</p>
                                    <p className="text-brand-red font-mono">{userInfo?.loginid || userInfo?.id || 'N/A'}</p>
                                </div>
                                <div className="pt-2">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowProfileMenu(false);
                                            // TODO: Navigate to account settings page
                                            alert('Account settings page coming soon!');
                                        }}
                                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded-lg transition-colors mb-2"
                                    >
                                        Account Settings
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            TokenService.clearTokens();
                                            window.location.href = '/';
                                        }}
                                        className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 rounded-lg transition-colors border border-red-500/20"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};
