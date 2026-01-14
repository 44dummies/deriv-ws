import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    const root = document.documentElement;
    
    if (resolved === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    
    return resolved;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'dark' as Theme, // Default to dark
            resolvedTheme: 'dark' as 'light' | 'dark',
            setTheme: (theme: Theme) => {
                const resolved = applyTheme(theme);
                set({ theme, resolvedTheme: resolved });
            },
        }),
        {
            name: 'tradermind-theme',
            onRehydrateStorage: () => (state) => {
                // Apply theme on page load
                if (state) {
                    const resolved = applyTheme(state.theme);
                    state.resolvedTheme = resolved;
                }
            },
        }
    )
);

// Initialize theme on first load
if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('tradermind-theme');
    if (stored) {
        try {
            const { state } = JSON.parse(stored);
            applyTheme(state?.theme || 'dark');
        } catch {
            applyTheme('dark');
        }
    } else {
        applyTheme('dark');
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const currentTheme = useThemeStore.getState().theme;
        if (currentTheme === 'system') {
            const resolved = applyTheme('system');
            useThemeStore.setState({ resolvedTheme: resolved });
        }
    });
}
