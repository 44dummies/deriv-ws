// TokenService - session-scoped storage for Deriv auth + profile bits
// Stores: deriv OAuth tokens, account info, derivId, balance, currency, backend access/refresh tokens

import type { TokenData } from '../types';

const TOKEN_KEY = 'deriv_tokens';
const ACCOUNT_KEY = 'deriv_account';
const DERIV_ID_KEY = 'derivId';
const BALANCE_KEY = 'balance';
const CURRENCY_KEY = 'currency';
const ACCESS_TOKEN_KEY = 'accessToken';
// NOTE: Refresh token is stored in HttpOnly cookie, NOT in sessionStorage

interface DerivAccount {
    loginid?: string;
    balance?: number;
    currency?: string;
    email?: string;
    fullname?: string;
    is_virtual?: number;
    [key: string]: unknown;
}

interface BackendTokens {
    accessToken: string | null;
    refreshToken: string | null;
}

interface ProfileInfo {
    derivId: string | null;
    balance: number;
    currency: string;
}

interface ProfileInfoInput {
    derivId?: string;
    balance?: number;
    currency?: string;
}

export const TokenService = {
    setTokens: (tokens: TokenData): void => {
        sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    },

    getTokens: (): TokenData | null => {
        const tokens = sessionStorage.getItem(TOKEN_KEY);
        return tokens ? JSON.parse(tokens) : null;
    },

    setBackendTokens: (accessToken?: string, _refreshToken?: string): void => {
        if (accessToken) sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        // Refresh token is in HttpOnly cookie - not stored here
    },

    getBackendTokens: (): BackendTokens => ({
        accessToken: sessionStorage.getItem(ACCESS_TOKEN_KEY),
        refreshToken: null // Refresh token is in HttpOnly cookie
    }),

    clearTokens: (): void => {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(ACCOUNT_KEY);
        sessionStorage.removeItem(DERIV_ID_KEY);
        sessionStorage.removeItem(BALANCE_KEY);
        sessionStorage.removeItem(CURRENCY_KEY);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        // Refresh token cookie is cleared by backend on logout
    },

    setAccount: (account: DerivAccount): void => {
        sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
        if (account?.loginid) {
            sessionStorage.setItem(DERIV_ID_KEY, account.loginid);
        }
        if (account?.balance !== undefined) {
            sessionStorage.setItem(BALANCE_KEY, String(account.balance));
        }
        if (account?.currency) {
            sessionStorage.setItem(CURRENCY_KEY, account.currency);
        }
    },

    getAccount: (): DerivAccount | null => {
        const account = sessionStorage.getItem(ACCOUNT_KEY);
        return account ? JSON.parse(account) : null;
    },

    setProfileInfo: ({ derivId, balance, currency }: ProfileInfoInput): void => {
        if (derivId) sessionStorage.setItem(DERIV_ID_KEY, derivId);
        if (balance !== undefined) sessionStorage.setItem(BALANCE_KEY, String(balance));
        if (currency) sessionStorage.setItem(CURRENCY_KEY, currency);
    },

    getProfileInfo: (): ProfileInfo => ({
        derivId: sessionStorage.getItem(DERIV_ID_KEY),
        balance: parseFloat(sessionStorage.getItem(BALANCE_KEY) || '0'),
        currency: sessionStorage.getItem(CURRENCY_KEY) || 'USD'
    }),

    isAuthenticated: (): boolean => {
        // Authenticated if we have either Deriv tokens or backend access token
        const derivTokens = sessionStorage.getItem(TOKEN_KEY);
        const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        return !!derivTokens || !!accessToken;
    }
};
