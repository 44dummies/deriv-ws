import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
// import { supabase } from '../lib/supabase';

interface DerivAccount {
    balance: number;
    currency: string;
    loginid: string;
    token: string;
    is_virtual: boolean;
}

interface User {
    id: string;
    email: string;
    role: string;
    deriv_accounts: DerivAccount[];
    active_account_id: string;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    initialize: () => Promise<void>;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    loginWithDeriv: (queryString: string) => Promise<void>;
    switchAccount: (accountId: string) => void;
    updateBalance: (balance: number, currency: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
    initialize: async () => {
        if (typeof window !== 'undefined' && (window as any).__CYPRESS_TEST_MODE__) {
            return;
        }

        const token = localStorage.getItem('auth_token');
        const storedAccounts = localStorage.getItem('deriv_accounts');

        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length < 2) throw new Error("Invalid token format");

                const payload = JSON.parse(atob(parts[1] as string));
                const accounts = storedAccounts ? JSON.parse(storedAccounts) : [];

                set({
                    user: {
                        id: payload.userId,
                        email: payload.email,
                        role: payload.role,
                        deriv_accounts: accounts,
                        active_account_id: accounts[0]?.loginid
                    },
                    session: { access_token: token } as any,
                    loading: false,
                    isAdmin: payload.role === 'ADMIN'
                });
            } catch (e) {
                console.error("Invalid stored token");
                localStorage.removeItem('auth_token');
                set({ loading: false });
            }
        } else {
            set({ loading: false });
        }
    },
    loginWithDeriv: async (queryString: string) => {
        try {
            set({ loading: true });

            // 1. Parse all accounts from query string
            const searchParams = new URLSearchParams(queryString);
            const accounts: DerivAccount[] = [];
            let i = 1;
            while (searchParams.get(`acct${i}`)) {
                const loginid = searchParams.get(`acct${i}`)!;
                const token = searchParams.get(`token${i}`)!;
                const currency = searchParams.get(`cur${i}`) || 'USD';
                const is_virtual = loginid.startsWith('VR');

                accounts.push({
                    loginid,
                    token,
                    currency,
                    is_virtual,
                    balance: 0 // Will be updated by WS
                });
                i++;
            }

            if (accounts.length === 0) throw new Error("No accounts found");

            // 2. Authenticate with backend using the first (primary) account
            const primaryAccount = accounts[0];
            if (!primaryAccount) throw new Error("Primary account not found");
            const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4000'}/api/v1/auth/deriv/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deriv_token: primaryAccount.token,
                    account_id: primaryAccount.loginid
                })
            });

            if (!response.ok) throw new Error('Backend login failed');

            const data = await response.json();

            if (data.accessToken) {
                localStorage.setItem('auth_token', data.accessToken);
                localStorage.setItem('deriv_accounts', JSON.stringify(accounts));

                set({
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        role: data.user.role,
                        deriv_accounts: accounts,
                        active_account_id: primaryAccount.loginid
                    },
                    session: { access_token: data.accessToken } as any,
                    isAdmin: data.user.role === 'ADMIN',
                    loading: false
                });
            }

        } catch (error) {
            console.error('Deriv Login Error:', error);
            set({ loading: false, user: null });
            throw error;
        }
    },
    switchAccount: (accountId: string) => {
        const { user } = get();
        if (user) {
            set({ user: { ...user, active_account_id: accountId } });
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
        localStorage.removeItem('auth_token');
        localStorage.removeItem('deriv_accounts');
        set({ user: null, session: null, isAdmin: false });
    }
}));

// Expose store to window for Cypress testing
if (typeof window !== 'undefined') {
    (window as any).useAuthStore = useAuthStore;
}

// End of file
