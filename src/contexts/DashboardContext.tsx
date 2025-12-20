import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import apiClient from '../services/apiClient';
import supabaseService from '../services/supabaseService';
import { tradingApi } from '../trading/tradingApi';
import { realtimeSocket } from '../services/realtimeSocket';

interface DashboardContextType {
    isLoading: boolean;
    userInfo: any;
    sessions: any[];
    activeSession: any;
    derivWsConnected: boolean;
    isOnline: boolean;
    serverLatency: number | null;
    setServerLatency: (latency: number | null) => void;
    refresh: () => Promise<void>;
    stats: any;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [derivWsConnected, setDerivWsConnected] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [serverLatency, setServerLatency] = useState<number | null>(null);

    const isInitialized = useRef(false);
    const lastBalanceFetchTime = useRef<number>(0); // Rate limit guard

    // Update state helper to match the useDashboardData logic
    const updateDashboardState = useCallback((newState: Partial<DashboardContextType>) => {
        if (newState.userInfo !== undefined) setUserInfo(newState.userInfo);
        if (newState.sessions !== undefined) setSessions(newState.sessions);
        if (newState.activeSession !== undefined) setActiveSession(newState.activeSession);
        if (newState.stats !== undefined) setStats(newState.stats);
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const statsRes = await tradingApi.getUserPerformance();
            setStats(statsRes?.data);
        } catch (e) {
            console.warn('Failed to fetch user performance stats:', e);
        }
    }, []);

    // Listen for realtime session updates
    useEffect(() => {
        const handleSessionUpdate = (data: any) => {
            console.log('Realtime session update:', data);

            // Normalize data if needed
            const session = data.session || data;

            // Update local state logic
            const isActiveUpdate = activeSession?.id === session.id;

            let newSessions = [...sessions];
            const index = newSessions.findIndex(s => s.id === session.id);

            if (['completed', 'ended', 'cancelled'].includes(session.status)) {
                // Remove ended session
                if (index !== -1) newSessions.splice(index, 1);
            } else {
                // Update or Add active/pending session
                if (index !== -1) {
                    newSessions[index] = { ...newSessions[index], ...session };
                } else {
                    // Only add if it qualifies (pending/active)
                    if (['pending', 'active', 'running'].includes(session.status)) {
                        newSessions.push(session);
                    }
                }
            }

            setSessions(newSessions);
            if (isActiveUpdate) {
                setActiveSession((prev: any) => ({ ...prev, ...session }));
            }
        };

        const handleTradeUpdate = (data: any) => {
            if (data.session) {
                handleSessionUpdate(data.session);
            }
            // Refetch stats on trade update
            fetchStats();
        };

        const handleBalanceUpdate = (data: any) => {
            console.log('[Dashboard] Balance Update:', data);
            setUserInfo((prev: any) => {
                if (!prev) return prev;
                const isReal = data.accountType === 'real';
                const isDemo = data.accountType === 'demo' || data.accountType === 'virtual';

                return {
                    ...prev,
                    real_balance: isReal ? Number(data.balance) : prev.real_balance,
                    demo_balance: isDemo ? Number(data.balance) : prev.demo_balance,
                    balance: isReal ? Number(data.balance) : prev.balance // Update main balance if real
                };
            });
        };

        realtimeSocket.on('session_update', handleSessionUpdate);
        realtimeSocket.on('session_status', handleSessionUpdate);
        realtimeSocket.on('trade_update', handleTradeUpdate);
        realtimeSocket.on('balance_update', handleBalanceUpdate);
        realtimeSocket.on('admin_balance_update', handleBalanceUpdate);

        return () => {
            realtimeSocket.off('session_update', handleSessionUpdate);
            realtimeSocket.off('session_status', handleSessionUpdate);
            realtimeSocket.off('trade_update', handleTradeUpdate);
            realtimeSocket.off('balance_update', handleBalanceUpdate);
            realtimeSocket.off('admin_balance_update', handleBalanceUpdate);
        };
    }, [sessions, activeSession, fetchStats]); // Dependencies needed for closures

    const initializeDashboard = useCallback(async () => {
        // Prevent double init
        if (isInitialized.current) return;

        try {
            if (!TokenService.isAuthenticated()) {
                // navigate('/'); // Don't redirect from context, let components handle auth protection
                return;
            }

            const tokens = TokenService.getTokens();
            if (!tokens) {
                return;
            }

            isInitialized.current = true;
            await websocketService.connect();
            setDerivWsConnected(true);

            // Authorize WS - Only force refresh if not authorized? 
            // The original code used true (force). Let's use false to prevent loop if already authed.
            // But if we need fresh balance, we might need it.
            // Ideally we authorize once.
            const authResponse = await websocketService.authorize(tokens.token, false);

            if (authResponse.error) {
                isInitialized.current = false; // Allow retry?
                setDerivWsConnected(false);
                TokenService.clearTokens();
                navigate('/');
                return;
            }

            let userData = null;

            // Extract User Info
            if (authResponse.authorize) {
                // console.log('Authorized:', authResponse.authorize.email);

                let loginid = authResponse.authorize.loginid;
                if (!loginid && authResponse.authorize.account_list?.length > 0) {
                    loginid = authResponse.authorize.account_list[0].loginid;
                }

                const currentBalance = authResponse.authorize.balance || 0;
                const isDemo = authResponse.authorize.is_virtual === 1;

                userData = {
                    balance: currentBalance,
                    currency: authResponse.authorize.currency,
                    email: authResponse.authorize.email,
                    fullname: authResponse.authorize.fullname,
                    id: loginid,
                    loginid: loginid,
                    is_virtual: isDemo,
                    demo_balance: isDemo ? currentBalance : 0,
                    real_balance: isDemo ? 0 : currentBalance,
                };

                // Sync with Storage
                sessionStorage.setItem('userInfo', JSON.stringify(userData));
                setUserInfo(userData);

                // Fetch All Balances (with rate limit guard)
                const now = Date.now();
                const BALANCE_COOLDOWN_MS = 5000; // 5 second minimum between balance API calls

                if (now - lastBalanceFetchTime.current > BALANCE_COOLDOWN_MS) {
                    lastBalanceFetchTime.current = now;
                    try {
                        const allBalancesRes = await websocketService.getAllBalances();

                        if (allBalancesRes.balance?.accounts) {
                            const accounts = allBalancesRes.balance.accounts;
                            let demoBalance = 0;
                            let realBalance = 0;

                            Object.entries(accounts).forEach(([id, acc]: [string, any]) => {
                                if (acc.demo_account === 1 || id.startsWith('VRTC') || (acc.type && acc.type === 'demo')) {
                                    demoBalance = Number(acc.balance || 0);
                                } else {
                                    realBalance = Number(acc.balance || 0);
                                }
                            });

                            // Update userData with balances
                            userData = {
                                ...userData,
                                demo_balance: demoBalance,
                                real_balance: realBalance
                            };

                            sessionStorage.setItem('userInfo', JSON.stringify(userData));
                            setUserInfo(userData);
                        }
                    } catch (e: any) {
                        // Silently handle rate limit errors
                        if (e?.code !== 'RateLimit') {
                            console.error('Failed to fetch balances', e);
                        }
                    }
                } else {
                    console.debug('[Dashboard] Skipping balance fetch - rate limited');
                }

                // Sync with Supabase (Background)
                if (supabaseService.isSupabaseConfigured() && loginid) {
                    supabaseService.upsertUserProfile(userData).catch(console.error);
                }

                // Backend Auth (Background)
                try {
                    const backendAuth = await apiClient.loginWithDeriv({
                        derivUserId: loginid,
                        loginid: loginid,
                        email: userData.email,
                        currency: userData.currency,
                        fullname: userData.fullname
                    });
                    sessionStorage.setItem('accessToken', backendAuth.accessToken);
                } catch (e) {
                    console.warn('Backend auth failed:', e);
                }
            }

            // Fetch Sessions
            let sessionsList = [];
            let active = null;
            try {
                const availableRes = await tradingApi.getAvailableSessions();
                sessionsList = availableRes.sessions || [];

                active = await tradingApi.getMyActiveSession();
            } catch (e) {
                console.error('Failed to fetch sessions:', e);
            }

            // Fetch Stats
            let statsData = null;
            try {
                const statsRes = await tradingApi.getUserPerformance();
                statsData = statsRes?.data;
            } catch (e) {
                // console.warn('Failed to fetch user performance stats:', e);
            }

            setSessions(sessionsList);
            setActiveSession(active);
            setStats(statsData);

        } catch (error) {
            console.error('Initialization failed:', error);
            isInitialized.current = false;
            TokenService.clearTokens();
            navigate('/');
        }
    }, [navigate]);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        // Force re-init? Or just re-fetch data?
        // Resetting init flag allows re-running the heavy logic
        isInitialized.current = false;
        await initializeDashboard();
        setIsLoading(false);
    }, [initializeDashboard]);

    // Initial load
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await initializeDashboard();
            setIsLoading(false);
        };
        load();
    }, [initializeDashboard]);

    return (
        <DashboardContext.Provider value={{
            isLoading,
            userInfo,
            sessions,
            activeSession,
            derivWsConnected,
            isOnline: derivWsConnected,
            serverLatency,
            setServerLatency,
            refresh,
            stats
        }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboardContext = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboardContext must be used within a DashboardProvider');
    }
    return context;
};
