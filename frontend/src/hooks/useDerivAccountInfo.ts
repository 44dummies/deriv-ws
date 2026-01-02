/**
 * Hook to fetch and maintain Deriv account details
 * Gets real-time account info including fullname, email, balance
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';

const APP_ID = import.meta.env.VITE_DERIV_APP_ID || '1089';

interface DerivAuthorizeResponse {
    authorize?: {
        account_list?: Array<{
            account_type: string;
            currency: string;
            is_disabled: number;
            is_virtual: number;
            landing_company_name: string;
            loginid: string;
        }>;
        balance: number;
        country: string;
        currency: string;
        email: string;
        fullname: string;
        is_virtual: number;
        landing_company_fullname: string;
        landing_company_name: string;
        loginid: string;
        user_id: number;
    };
    error?: {
        code: string;
        message: string;
    };
}

export function useDerivAccountInfo() {
    const { user, updateBalance } = useAuthStore();
    const activeAccount = user?.deriv_accounts?.find(a => a.loginid === user?.active_account_id);
    const socketRef = useRef<WebSocket | null>(null);
    const hasInitialized = useRef(false);

    const updateUserFullname = useCallback((fullname: string, email: string) => {
        const { user } = useAuthStore.getState();
        if (user && (user.fullname !== fullname || user.email !== email)) {
            useAuthStore.setState({
                user: {
                    ...user,
                    fullname: fullname || user.fullname,
                    email: email || user.email
                }
            });
        }
    }, []);

    useEffect(() => {
        if (!activeAccount?.token || hasInitialized.current) return;

        // Close existing connection if any
        if (socketRef.current) {
            socketRef.current.close();
        }

        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('[DerivAccountInfo] Connected, authorizing...');
            ws.send(JSON.stringify({ authorize: activeAccount.token }));
        };

        ws.onmessage = (event) => {
            const data: DerivAuthorizeResponse & { msg_type?: string; balance?: any } = JSON.parse(event.data);

            if (data.error) {
                console.error('[DerivAccountInfo] Error:', data.error.message);
                return;
            }

            if (data.msg_type === 'authorize' && data.authorize) {
                console.log('[DerivAccountInfo] Authorized:', data.authorize.fullname);
                hasInitialized.current = true;

                // Update user fullname and email from Deriv
                updateUserFullname(data.authorize.fullname, data.authorize.email);
                
                // Update balance
                updateBalance(data.authorize.balance, data.authorize.currency);

                // Subscribe to balance updates
                ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            }

            if (data.msg_type === 'balance' && data.balance) {
                updateBalance(Number(data.balance.balance), data.balance.currency);
            }
        };

        ws.onerror = (error) => {
            console.error('[DerivAccountInfo] WebSocket error:', error);
        };

        // Keep-alive ping
        const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ ping: 1 }));
            }
        }, 30000);

        return () => {
            clearInterval(pingInterval);
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [activeAccount?.token, activeAccount?.loginid, updateBalance, updateUserFullname]);

    // Reset initialization flag when account changes
    useEffect(() => {
        hasInitialized.current = false;
    }, [activeAccount?.loginid]);

    return {
        fullname: user?.fullname || 'Trader',
        email: user?.email || '',
        balance: activeAccount?.balance || 0,
        currency: activeAccount?.currency || 'USD',
        isVirtual: activeAccount?.is_virtual || false,
        loginid: activeAccount?.loginid || ''
    };
}
