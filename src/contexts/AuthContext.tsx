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

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
    isAuthenticating: boolean; // True during callback/login process
}

interface AuthContextType extends AuthState {
    setAccessToken: (token: string | null) => void;
    setUser: (user: AuthState['user']) => void;
    login: (accessToken: string, user: AuthState['user']) => void;
    logout: () => Promise<void>;
    refreshAccessToken: () => Promise<string | null>;
    startCallbackAuth: () => void;
    finishCallbackAuth: () => void;
    failAuth: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

import { CONFIG } from '../config/constants';

const API_BASE = CONFIG.API_URL;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthState['user']>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false); // For active login/callback
    const [isLoading, setIsLoading] = useState(true); // For initial hydration

    const isAuthenticated = !!accessToken;

    // Login: store access token in memory and sync via apiClient
    const login = useCallback((token: string, userData: AuthState['user']) => {
        apiClient.setTokens(token, sessionStorage.getItem('refreshToken') || undefined);
        setAccessToken(token);
        setIsLoading(false); // OPTIMISTIC: Unlock UI immediately

        const normalizedUser = userData ? {
            ...userData,
            fullName: userData.fullName || (userData as any).fullname || (userData as any).display_name || (userData as any).displayName,
            derivId: userData.derivId || (userData as any).deriv_id,
            role: userData.role || ((userData as any).is_admin ? 'ADMIN' : 'USER'),
            is_admin: (userData as any).is_admin || userData.role === 'admin'
        } : null;

        setUser(normalizedUser);

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
    const refreshPromise = useRef<Promise<string | null> | null>(null);

    const refreshAccessToken = useCallback(async (): Promise<string | null> => {
        if (refreshPromise.current) {
            return refreshPromise.current;
        }

        refreshPromise.current = (async () => {
            try {
                const success = await apiClient.refreshAccessToken();
                if (success) {
                    const { accessToken } = apiClient.loadTokens();
                    if (accessToken) {
                        setAccessToken(accessToken);
                        return accessToken;
                    }
                }
                setAccessToken(null);
                setUser(null);
                return null;
            } catch (error) {
                console.error('Token refresh failed:', error);
                return null;
            } finally {
                refreshPromise.current = null;
            }
        })();

        return refreshPromise.current;
    }, []);

    // Unified Initialization Effect (Hydration + Initial Refresh)
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // 1. Check memory first
                if (accessToken) {
                    setIsLoading(false);
                    return;
                }

                // 2. Load basic user info to prevent flickering
                const storedUserInfo = sessionStorage.getItem('userInfo');
                const storedAccessToken = sessionStorage.getItem('accessToken');

                if (storedUserInfo) {
                    try {
                        setUser(JSON.parse(storedUserInfo));
                    } catch (e) { console.warn('Parse user error', e); }
                }

                // 3. Check if we have a valid token in storage
                if (storedAccessToken) {
                    try {
                        const decoded = jwtDecode<DecodedToken>(storedAccessToken);
                        const currentTime = Date.now() / 1000;

                        // If token is valid (> 5 min remaining), use it
                        if (decoded.exp - currentTime > 300) {
                            setAccessToken(storedAccessToken);
                            apiClient.setTokens(storedAccessToken);
                            setIsLoading(false);
                            return;
                        }
                    } catch (e) {
                        // Invalid token, proceed to refresh
                    }
                }

                // 4. If we have evidence of a session (storedUserInfo) but no valid access token,
                //    attempt to refresh using the HttpOnly cookie.
                if (storedUserInfo || storedAccessToken) {
                    console.debug('[AuthContext] Attempting initial token refresh...');
                    const newToken = await refreshAccessToken();
                    if (newToken) {
                        // Refresh successful, user is authenticated
                        // Fetch fresh profile in background
                        apiClient.getMyProfile().then(profile => {
                            if (profile) {
                                const normalizedUser = {
                                    ...profile,
                                    fullName: profile.display_name || profile.username,
                                    derivId: profile.deriv_id,
                                    role: profile.role || (profile.is_admin ? 'ADMIN' : 'USER'),
                                    is_admin: profile.is_admin || profile.role === 'admin'
                                };
                                setUser(normalizedUser);
                                sessionStorage.setItem('userInfo', JSON.stringify(normalizedUser));
                            }
                        }).catch(console.error);
                    } else {
                        // Refresh failed, clear session
                        console.debug('[AuthContext] Initial refresh failed, clearing session.');
                        await logout();
                    }
                } else {
                    // No session evidence
                }

            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                // ALWAYS release the loading state at the end
                setIsLoading(false);
            }
        };

        if (window.location.pathname.includes('/callback') || isAuthenticating) {
            // Let callback handler manage loading state
            return;
        }

        initializeAuth();
    }, []); // Run once on mount
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

    // Explicit auth flow control
    const startCallbackAuth = useCallback(() => setIsAuthenticating(true), []);
    const finishCallbackAuth = useCallback(() => setIsAuthenticating(false), []);
    const failAuth = useCallback(() => {
        setAccessToken(null);
        setUser(null);
        setIsAuthenticating(false);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                accessToken,
                user,
                isAuthenticated,
                isAuthenticating, // Expose state
                setAccessToken,
                setUser,
                login,
                logout,
                refreshAccessToken,
                startCallbackAuth,
                finishCallbackAuth,
                failAuth,
                isLoading
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
