import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'default' | 'cyberpunk' | 'midnight' | 'corporate' | 'ocean';

interface ThemeState {
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
    applyTheme: () => void;
}

const themes: Record<Theme, Record<string, string>> = {
    default: {
        '--color-primary': '217 91% 60%', // Blue
        '--color-primary-glow': '#3b82f6',
        '--color-accent-glow': '#8b5cf6',
        '--color-surface': '#1e293b',
        '--color-background': '#0f172a',
    },
    cyberpunk: {
        '--color-primary': '312 100% 50%', // Pink/Magenta
        '--color-primary-glow': '#ff00ff',
        '--color-accent-glow': '#00ffff',
        '--color-surface': '#120515',
        '--color-background': '#000000',
    },
    midnight: {
        '--color-primary': '260 100% 65%', // Purple
        '--color-primary-glow': '#a855f7',
        '--color-accent-glow': '#3b82f6',
        '--color-surface': '#0f1025',
        '--color-background': '#020210',
    },
    corporate: {
        '--color-primary': '150 100% 35%', // Green
        '--color-primary-glow': '#10b981',
        '--color-accent-glow': '#064e3b',
        '--color-surface': '#18181b',
        '--color-background': '#09090b',
    },
    ocean: {
        '--color-primary': '190 90% 50%', // Cyan
        '--color-primary-glow': '#06b6d4',
        '--color-accent-glow': '#3b82f6',
        '--color-surface': '#0c2436',
        '--color-background': '#04121f',
    }
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            currentTheme: 'default',
            setTheme: (theme) => {
                set({ currentTheme: theme });
                get().applyTheme();
            },
            applyTheme: () => {
                const theme = get().currentTheme;
                const variables = themes[theme] || themes.default;

                const root = document.documentElement;
                Object.entries(variables).forEach(([key, value]) => {
                    root.style.setProperty(key, value);
                    // Also update Tailwind-friendly HSL variables if needed customization
                });
            }
        }),
        {
            name: 'tradermind-theme-storage',
        }
    )
);
