import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import apiClient from '../services/apiClient';
import supabaseService from '../services/supabaseService';
import { tradingApi } from '../trading/tradingApi';

export const useDashboardData = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [derivWsConnected, setDerivWsConnected] = useState(false);
    const isInitialized = useRef(false);

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
                    if (allBalancesRes.balance?.accounts) {
                        const accounts = allBalancesRes.balance.accounts;
                        let demoBalance = 0;
                        let realBalance = 0;

                        Object.entries(accounts).forEach(([id, acc]: [string, any]) => {
                            if (acc.demo_account === 1 || id.startsWith('VRTC')) {
                                demoBalance = acc.balance || 0;
                            } else {
                                realBalance = acc.balance || 0;
                            }
                        });

                        setUserInfo((prev: any) => prev ? {
                            ...prev,
                            demo_balance: demoBalance,
                            real_balance: realBalance
                        } : null);
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

            // Fetch Sessions
            let sessions = [];
            let activeSession = null;
            try {
                const sessionsRes = await tradingApi.getSessions();
                sessions = Array.isArray(sessionsRes) ? sessionsRes : (sessionsRes.data || []);
                activeSession = await tradingApi.getMyActiveSession();
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
    }>({
        userInfo: null,
        sessions: [],
        activeSession: null
    });

    // Wrapper to update state
    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        const data = await initializeDashboard();
        if (data) {
            setDashboardState(prev => ({
                ...prev,
                userInfo: data.userInfo,
                sessions: data.sessions,
                activeSession: data.activeSession
            }));
        }
        setIsLoading(false);
    }, [initializeDashboard]);

    // Initial load
    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    return {
        isLoading,
        userInfo: dashboardState.userInfo,
        sessions: dashboardState.sessions,
        activeSession: dashboardState.activeSession,
        derivWsConnected,
        refresh: loadDashboard
    };
};
