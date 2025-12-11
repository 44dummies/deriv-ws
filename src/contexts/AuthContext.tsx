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

interface AuthState {
    accessToken: string | null;
    user: {
        id?: string;
        derivId?: string;
        email?: string;
        fullName?: string;
        is_admin?: boolean;
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

const API_BASE = (typeof process !== 'undefined' && process.env?.REACT_APP_SERVER_URL)
    ? `${process.env.REACT_APP_SERVER_URL}/api`
    : 'https://tradermind-server.up.railway.app/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthState['user']>(null);

    const isAuthenticated = !!accessToken;

    // Login: store access token in memory
    const login = useCallback((token: string, userData: AuthState['user']) => {
        setAccessToken(token);
        setUser(userData);

        // Store non-sensitive user info in sessionStorage for UI purposes
        if (userData) {
            sessionStorage.setItem('userInfo', JSON.stringify(userData));
        }
    }, []);

    // Logout: clear memory and call backend to clear cookie
    const logout = useCallback(async () => {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include', // Include cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
                }
            });
        } catch (e) {
            // Ignore errors on logout
        }

        setAccessToken(null);
        setUser(null);
        sessionStorage.removeItem('userInfo');
        sessionStorage.removeItem('derivId');
        sessionStorage.removeItem('derivToken');
        sessionStorage.removeItem('derivDemoToken');
        sessionStorage.removeItem('derivRealToken');
    }, [accessToken]);

    // Refresh access token using HttpOnly cookie
    const refreshAccessToken = useCallback(async (): Promise<string | null> => {
        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                credentials: 'include', // Browser sends HttpOnly cookie automatically
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.accessToken) {
                    setAccessToken(data.accessToken);
                    return data.accessToken;
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
    useEffect(() => {
        const tryRefresh = async () => {
            // Check if we have user info in session (meaning user was logged in)
            const storedUserInfo = sessionStorage.getItem('userInfo');
            if (storedUserInfo) {
                const token = await refreshAccessToken();
                if (token) {
                    try {
                        setUser(JSON.parse(storedUserInfo));
                    } catch (e) {
                        // Invalid user info
                    }
                }
            }
        };
        tryRefresh();
    }, [refreshAccessToken]);

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
