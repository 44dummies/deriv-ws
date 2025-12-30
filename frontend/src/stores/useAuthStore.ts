import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
// import { supabase } from '../lib/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    initialize: () => Promise<void>;
    signIn: () => Promise<void>; // Will likely just redirect or handle generic flow
    signOut: () => Promise<void>;
    loginWithDeriv: (derivToken: string, accountId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
    initialize: async () => {
        // Bypass for Cypress E2E Simulation
        if (typeof window !== 'undefined' && (window as any).__CYPRESS_TEST_MODE__) {
            console.log('Skipping Auth Init (Cypress Mode)');
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (token) {
            // Validate token basically (decode) or call /me endpoint
            // For now, assume valid or let middleware reject requests
            try {
                // Determine user details from token payload if possible, or fetch from API
                const parts = token.split('.');
                if (parts.length < 2) throw new Error("Invalid token format");

                const payload = JSON.parse(atob(parts[1] as string));
                set({
                    user: { id: payload.userId, email: payload.email } as any,
                    session: { access_token: token } as any, // Mock session structure
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
    loginWithDeriv: async (derivToken: string, accountId: string) => {
        try {
            set({ loading: true });
            const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4000'}/api/v1/auth/deriv/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deriv_token: derivToken, account_id: accountId })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();

            if (data.accessToken) {
                localStorage.setItem('auth_token', data.accessToken);
                set({
                    user: data.user,
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
    signIn: async () => {
        // Placeholder for specific sign in logic if needed here, 
        // usually handled in the Login component directly via supabase.auth.signInWith...
    },
    signOut: async () => {
        localStorage.removeItem('auth_token');
        set({ user: null, session: null, isAdmin: false });
        // Optional: window.location.href = '/';
    }
}));

// Expose store to window for Cypress testing
if (typeof window !== 'undefined') {
    (window as any).useAuthStore = useAuthStore;
}

// End of file
