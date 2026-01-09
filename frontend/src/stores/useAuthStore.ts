import { create } from 'zustand';
// import { supabase } from '../lib/supabase';

/**
 * SECURITY: Deriv tokens are NEVER stored client-side
 * - JWT is managed via httpOnly cookies (set by backend)
 * - Frontend only tracks authentication state, not tokens
 * - Deriv account info (without tokens) is stored in memory only
 */

interface DerivAccountInfo {
    balance: number;
    currency: string;
    loginid: string;
    is_virtual: boolean;
    fullname?: string;
    email?: string;
    // NOTE: 'token' field removed - tokens stay server-side only
}

interface User {
    id: string;
    email: string;
    fullname: string;
    role: string;
    deriv_accounts: DerivAccountInfo[];
    active_account_id: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    isAdmin: boolean;
    initialize: () => Promise<void>;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    loginWithDeriv: (queryString: string) => Promise<void>;
    switchAccount: (accountId: string) => Promise<void>;
    updateBalance: (balance: number, currency: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    loading: true,
    isAdmin: false,
    initialize: async () => {
        if (typeof window !== 'undefined' && (window as any).__CYPRESS_TEST_MODE__) {
            return;
        }

        try {
            // Check authentication status via backend (cookie-based)
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const response = await fetch(`${baseUrl}/api/v1/auth/session`, {
                method: 'GET',
                credentials: 'include', // Include httpOnly cookies
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    set({
                        user: {
                            id: data.user.id,
                            email: data.user.email,
                            fullname: data.user.fullname || data.user.email?.split('@')[0] || 'Trader',
                            role: data.user.role,
                            deriv_accounts: data.user.deriv_accounts || [],
                            active_account_id: data.user.active_account_id
                        },
                        isAuthenticated: true,
                        loading: false,
                        isAdmin: data.user.role === 'ADMIN'
                    });
                    return;
                }
            }
            // Not authenticated or error
            set({ loading: false, isAuthenticated: false });
        } catch (e) {
            console.error("Session check failed:", e);
            set({ loading: false, isAuthenticated: false });
        }
    },
    loginWithDeriv: async (queryString: string) => {
        try {
            set({ loading: true });

            // 1. Parse accounts from query string (for display only - no tokens stored)
            const searchParams = new URLSearchParams(queryString);
            const accountInfos: DerivAccountInfo[] = [];
            let i = 1;
            while (searchParams.get(`acct${i}`)) {
                const loginid = searchParams.get(`acct${i}`)!;
                const currency = searchParams.get(`cur${i}`) || 'USD';
                const is_virtual = loginid.startsWith('VR');

                accountInfos.push({
                    loginid,
                    currency,
                    is_virtual,
                    balance: 0 // Will be updated by WS
                });
                i++;
            }

            if (accountInfos.length === 0) throw new Error("No accounts found");

            // 2. Send tokens to backend via POST (tokens never stored client-side)
            const primaryAccount = accountInfos[0];
            if (!primaryAccount) throw new Error("Primary account not found");
            
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            
            // Collect all tokens to send to backend
            const tokensPayload: { accountId: string; token: string }[] = [];
            i = 1;
            while (searchParams.get(`acct${i}`)) {
                const accountId = searchParams.get(`acct${i}`)!;
                const token = searchParams.get(`token${i}`)!;
                if (accountId && token) {
                    tokensPayload.push({ accountId, token });
                }
                i++;
            }

            const response = await fetch(`${baseUrl}/api/v1/auth/deriv/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Receive httpOnly cookie
                body: JSON.stringify({
                    accounts: tokensPayload,
                    primary_account_id: primaryAccount.loginid
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Backend login failed');
            }

            const data = await response.json();

            // Backend sets httpOnly cookie - we just update local state (no tokens!)
            const fullname = data.user?.fullname || 
                             data.deriv_account?.fullname || 
                             data.user?.email?.split('@')[0] || 
                             'Trader';

            // Merge backend account data with our parsed info
            const mergedAccounts = accountInfos.map(info => ({
                ...info,
                balance: data.deriv_account?.loginid === info.loginid 
                    ? data.deriv_account?.balance || 0 
                    : 0
            }));

            set({
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    fullname: fullname,
                    role: data.user.role,
                    deriv_accounts: mergedAccounts,
                    active_account_id: primaryAccount.loginid
                },
                isAuthenticated: true,
                isAdmin: data.user.role === 'ADMIN',
                loading: false
            });

        } catch (error) {
            console.error('Deriv Login Error:', error);
            set({ loading: false, user: null, isAuthenticated: false });
            throw error;
        }
    },
    switchAccount: async (accountId: string) => {
        const { user } = get();
        if (!user) return;

        try {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const response = await fetch(`${baseUrl}/api/v1/auth/switch-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ account_id: accountId })
            });

            if (response.ok) {
                set({ user: { ...user, active_account_id: accountId } });
            }
        } catch (error) {
            console.error('Account switch failed:', error);
        }
    },
    updateBalance: (balance: number, currency: string) => {
        const { user } = get();
        if (user) {
            const updatedAccounts = user.deriv_accounts.map(acc =>
                acc.loginid === user.active_account_id
                    ? { ...acc, balance, currency }
                    : acc
            );
            set({ user: { ...user, deriv_accounts: updatedAccounts } });
        }
    },
    signIn: async () => { },
    signOut: async () => {
        try {
            const baseUrl = (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
            await fetch(`${baseUrl}/api/v1/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error('Logout request failed:', e);
        }
        // Clear local state regardless of request success
        set({ user: null, isAuthenticated: false, isAdmin: false });
    }
}));

// Expose store to window for Cypress testing
if (typeof window !== 'undefined') {
    (window as any).useAuthStore = useAuthStore;
}

// End of file
