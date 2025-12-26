/**
 * AuthContext - Secure In-Memory Token Storage
 * 
 * Stores access token in memory only (not sessionStorage/localStorage).
 * Refresh token is handled via HttpOnly cookie (browser handles automatically).
 * 
 * Security benefits:
 * - Access tokens can't be stolen via XSS (not in storage)
 * - Refresh tokens can't be read by JavaScript (HttpOnly cookie)
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { realtimeSocket } from '../services/realtimeSocket';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    exp: number;
    iat: number;
    userId: string;
    role: string;
}

interface AuthState {
    accessToken: string | null;
    user: {
        id?: string;
        derivId?: string;
        email?: string;
        fullName?: string;
        is_admin?: boolean;
        profile_photo?: string;
        role?: string;
    } | null;
    isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
    setAccessToken: (token: string | null) => void;
    setUser: (user: AuthState['user']) => void;
    login: (accessToken: string, user: AuthState['user']) => void;
    logout: () => Promise<void>;
    refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

import { CONFIG } from '../config/constants';

const API_BASE = CONFIG.API_URL;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthState['user']>(null);

    const isAuthenticated = !!accessToken;

    // Login: store access token in memory and sync via apiClient
    const login = useCallback((token: string, userData: AuthState['user']) => {
        apiClient.setTokens(token);
        setAccessToken(token);
        // Normalize user data to match interface
        const normalizedUser = userData ? {
            ...userData,
            ...userData,
            // Robust mapping for name and id
            fullName: userData.fullName || (userData as any).fullname || (userData as any).display_name || (userData as any).displayName,
            derivId: userData.derivId || (userData as any).deriv_id,
            role: userData.role || ((userData as any).is_admin ? 'ADMIN' : 'USER'),
            is_admin: (userData as any).is_admin || userData.role === 'admin'
        } : null;

        setUser(normalizedUser);

        // Store non-sensitive user info in sessionStorage for UI purposes
        if (normalizedUser) {
            sessionStorage.setItem('userInfo', JSON.stringify(normalizedUser));
        }
    }, []);

    // Logout: clear memory and call backend to clear cookie
    const logout = useCallback(async () => {
        try {
            await apiClient.logout();
        } catch (e) {
            console.error('Logout error:', e);
        }

        realtimeSocket.disconnect();

        setAccessToken(null);
        setUser(null);
        sessionStorage.removeItem('userInfo');
        sessionStorage.removeItem('derivId');
        sessionStorage.removeItem('derivToken');
        sessionStorage.removeItem('derivDemoToken');
        sessionStorage.removeItem('derivRealToken');
    }, []);

    // Register auth error handler to trigger logout on 401s
    useEffect(() => {
        apiClient.onAuthenticationError(() => {
            console.log('[AuthContext] Auth error detected, logging out...');
            logout();
        });
    }, [logout]);

    // Refresh access token using HttpOnly cookie
    const refreshAccessToken = useCallback(async (): Promise<string | null> => {
        try {
            // Use apiClient to refresh (this updates apiClient state and sessionStorage)
            const success = await apiClient.refreshAccessToken();

            if (success) {
                const { accessToken } = apiClient.loadTokens();
                if (accessToken) {
                    setAccessToken(accessToken);
                    return accessToken;
                }
            }

            // Refresh failed - user needs to re-login
            setAccessToken(null);
            setUser(null);
            return null;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return null;
        }
    }, []);

    // Try to refresh token on mount (handles page refresh)
    // Guard: Only attempt refresh if there's evidence of a prior session
    useEffect(() => {
        const tryRefresh = async () => {
            // Guard: Skip refresh on OAuth callback (Callback will handle auth)
            if (window.location.pathname.includes('/callback')) {
                console.debug('[AuthContext] On callback page, skipping auto-refresh');
                return;
            }

            // Guard: Skip refresh if no prior session exists
            const storedUserInfo = sessionStorage.getItem('userInfo');
            if (!storedUserInfo) {
                console.debug('[AuthContext] No prior session, skipping refresh');
                return;
            }

            const token = await refreshAccessToken();
            if (token) {
                // Fetch fresh user data from backend to ensure roles are up to date
                try {
                    const profile = await apiClient.getMyProfile();
                    if (profile) {
                        const normalizedUser = {
                            ...profile,
                            // Ensure compatibility with AuthState interface
                            fullName: profile.display_name || profile.username,
                            derivId: profile.deriv_id,
                            role: profile.role || (profile.is_admin ? 'ADMIN' : 'USER'),
                            is_admin: profile.is_admin || profile.role === 'admin'
                        };
                        setUser(normalizedUser);
                        sessionStorage.setItem('userInfo', JSON.stringify(normalizedUser));
                    }
                } catch (e) {
                    console.error('Failed to fetch user profile on refresh:', e);
                    // Fallback to session storage if fetch fails
                    try {
                        setUser(JSON.parse(storedUserInfo));
                    } catch (err) { }
                }
            } else {
                console.debug('[AuthContext] Initial refresh failed, forcing logout to clear state');
                // Refresh failed - clear ALL stale session data to prevent loops
                await logout();
            }
        };
        tryRefresh();
    }, [refreshAccessToken]);

    // Proactive Token Refresh Monitoring
    useEffect(() => {
        if (!accessToken) return;

        const checkExpiry = async () => {
            try {
                const decoded = jwtDecode<DecodedToken>(accessToken);
                const currentTime = Date.now() / 1000;
                const timeUntilExpiry = decoded.exp - currentTime;

                // Refresh if expiring within 2 minutes (120 seconds)
                if (timeUntilExpiry < 120) {
                    console.debug(`[AuthContext] Token expiring soon (${Math.round(timeUntilExpiry)}s), refreshing...`);
                    await refreshAccessToken();
                }
            } catch (error) {
                console.error('[AuthContext] Error checking token expiry:', error);
            }
        };

        // Check every minute
        const intervalId = setInterval(checkExpiry, 60 * 1000);
        checkExpiry(); // Initial check

        return () => clearInterval(intervalId);
    }, [accessToken, refreshAccessToken]);

    return (
        <AuthContext.Provider
            value={{
                accessToken,
                user,
                isAuthenticated,
                setAccessToken,
                setUser,
                login,
                logout,
                refreshAccessToken
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
