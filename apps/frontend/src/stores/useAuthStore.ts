import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    initialize: () => Promise<void>;
    signIn: () => Promise<void>; // Will likely just redirect or handle generic flow
    signOut: () => Promise<void>;
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

        try {
            const { data: { session } } = await supabase.auth.getSession();

            let isAdmin = false;
            if (session?.user) {
                // simple role check, can be expanded to check DB profiles
                isAdmin = session.user.email === 'admin@tradermind.com' || (session.user.app_metadata?.role === 'admin');
            }

            set({
                user: session?.user ?? null,
                session,
                loading: false,
                isAdmin
            });

            // Listen for changes
            supabase.auth.onAuthStateChange(async (_event, session) => {
                let isAdmin = false;
                if (session?.user) {
                    isAdmin = session.user.email === 'admin@tradermind.com' || (session.user.app_metadata?.role === 'admin');
                }
                set({ user: session?.user ?? null, session, loading: false, isAdmin });
            });

        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ loading: false });
        }
    },
    signIn: async () => {
        // Placeholder for specific sign in logic if needed here, 
        // usually handled in the Login component directly via supabase.auth.signInWith...
    },
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, isAdmin: false });
    }
}));

// Expose store to window for Cypress testing
if (typeof window !== 'undefined') {
    (window as any).useAuthStore = useAuthStore;
}

// End of file
