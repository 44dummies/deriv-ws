import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import apiClient from '../services/apiClient';
import supabaseService from '../services/supabaseService';
import { tradingApi } from '../trading/tradingApi';
import { realtimeSocket } from '../services/realtimeSocket';

export const useDashboardData = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [derivWsConnected, setDerivWsConnected] = useState(false);
    const isInitialized = useRef(false);

    // Listen for realtime session updates
    useEffect(() => {
        const handleSessionUpdate = (data: any) => {
            console.log('Realtime session update:', data);

            // Normalize data if needed
            const session = data.session || data;

            setDashboardState(prev => {
                // Update active session if ID matches or if it's the *current* active one
                const isActiveUpdate = prev.activeSession?.id === session.id;

                // Update sessions list (replace or add)
                // Note: If session ended, we might want to remove it? 
                // User said "if a session ended it should not be displayed".
                // backend /available filtered pending/active.
                // If update says status is 'completed' or 'ended', remove from list.

                let newSessions = [...prev.sessions];
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
                        if (['pending', 'active'].includes(session.status)) {
                            newSessions.push(session);
                        }
                    }
                }

                return {
                    ...prev,
                    sessions: newSessions,
                    activeSession: isActiveUpdate ? { ...prev.activeSession, ...session } : prev.activeSession
                };
            });
        };

        realtimeSocket.on('session_update', handleSessionUpdate);
        realtimeSocket.on('session_status', handleSessionUpdate);
        realtimeSocket.on('trade_update', (data: any) => {
            // Also update session stats on trade if provided
            if (data.session) {
                handleSessionUpdate(data.session);
            }
        });

        return () => {
            realtimeSocket.off('session_update', handleSessionUpdate);
            realtimeSocket.off('session_status', handleSessionUpdate);
            realtimeSocket.off('trade_update', handleSessionUpdate);
        };
    }, []);

    const initializeDashboard = useCallback(async () => {
        if (isInitialized.current) return;

        try {
            if (!TokenService.isAuthenticated()) {
                navigate('/');
                return;
            }

            const tokens = TokenService.getTokens();
            if (!tokens) {
                navigate('/');
                return;
            }

            isInitialized.current = true;
            await websocketService.connect();
            setDerivWsConnected(true);

            // Authorize WS
            const authResponse = await websocketService.authorize(tokens.token, true);
            if (authResponse.error) {
                isInitialized.current = false;
                setDerivWsConnected(false);
                TokenService.clearTokens();
                navigate('/');
                return;
            }

            let userData = null;

            // Extract User Info
            if (authResponse.authorize) {
                console.log('Authorized:', authResponse.authorize.email);

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
                    id: loginid, // Map loginid to id for API consistency
                    loginid: loginid,
                    is_virtual: isDemo,
                    demo_balance: isDemo ? currentBalance : 0,
                    real_balance: isDemo ? 0 : currentBalance,
                };

                // Sync with Storage
                sessionStorage.setItem('userInfo', JSON.stringify(userData));
                setUserInfo(userData);

                // Fetch All Balances
                try {
                    const allBalancesRes = await websocketService.getAllBalances();
                    console.log('[Debug] All Balances Response:', allBalancesRes); // DEBUG LOG

                    if (allBalancesRes.balance?.accounts) {
                        const accounts = allBalancesRes.balance.accounts;
                        let demoBalance = 0;
                        let realBalance = 0;

                        Object.entries(accounts).forEach(([id, acc]: [string, any]) => {
                            // Enhanced check for demo accounts
                            if (acc.demo_account === 1 || id.startsWith('VRTC') || (acc.type && acc.type === 'demo')) {
                                demoBalance = Number(acc.balance || 0);
                            } else {
                                realBalance = Number(acc.balance || 0);
                            }
                        });

                        console.log('[Debug] Parsed Balances - Demo:', demoBalance, 'Real:', realBalance); // DEBUG LOG

                        // Update userData with balances
                        userData = {
                            ...userData,
                            demo_balance: demoBalance,
                            real_balance: realBalance
                        };

                        // Also update sessionStorage with correct balances
                        sessionStorage.setItem('userInfo', JSON.stringify(userData));
                        setUserInfo(userData);
                    }
                } catch (e) {
                    console.error('Failed to fetch balances', e);
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

            // Fetch Sessions (Filtered for User)
            let sessions = [];
            let activeSession = null;
            try {
                // Fetch available sessions for joining/viewing
                const availableRes = await tradingApi.getAvailableSessions();
                sessions = availableRes.sessions || []; // Ensure sessions array

                // Also check for active session status
                // If user has an active session, it might be in available (if started) or not (if full/private/etc, though unlikely for now)
                activeSession = await tradingApi.getMyActiveSession();

                // If active session exists, ensure it's in the list or handled appropriately
            } catch (e) {
                console.error('Failed to fetch sessions:', e);
            }

            return {
                userInfo: userData,
                sessions,
                activeSession
            };

        } catch (error) {
            console.error('Initialization failed:', error);
            isInitialized.current = false;
            TokenService.clearTokens();
            navigate('/');
            return null;
        }
    }, [navigate]);

    // Combined state
    const [dashboardState, setDashboardState] = useState<{
        userInfo: any;
        sessions: any[];
        activeSession: any;
        stats: any;
    }>({
        userInfo: null,
        sessions: [],
        activeSession: null,
        stats: null
    });

    // Wrapper to update state
    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        const data = await initializeDashboard();

        let stats = null;
        try {
            const statsRes = await tradingApi.getUserPerformance();
            stats = statsRes?.data;
        } catch (e) {
            console.warn('Failed to fetch user performance stats:', e);
        }

        if (data) {
            setDashboardState(prev => ({
                ...prev,
                userInfo: data.userInfo,
                sessions: data.sessions,
                activeSession: data.activeSession,
                stats
            }));
        }
        setIsLoading(false);
    }, [initializeDashboard]);

    // Initial load
    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const [serverLatency, setServerLatency] = useState<number | null>(null);

    return {
        isLoading,
        userInfo: dashboardState.userInfo,
        sessions: dashboardState.sessions,
        activeSession: dashboardState.activeSession,
        derivWsConnected,
        isOnline: derivWsConnected,
        serverLatency,
        setServerLatency,

        refresh: loadDashboard,
        stats: dashboardState.stats
    };
};
