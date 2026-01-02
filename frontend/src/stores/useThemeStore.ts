import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'default' | 'cyberpunk' | 'midnight' | 'corporate' | 'ocean';

interface ThemeState {
    currentTheme: Theme;
    isDarkMode: boolean;
    setTheme: (theme: Theme) => void;
    toggleDarkMode: () => void;
    setDarkMode: (isDark: boolean) => void;
    applyTheme: () => void;
}

const themes: Record<Theme, Record<string, string>> = {
    default: {
        '--color-primary': '217 91% 60%',
        '--color-primary-glow': '#3b82f6',
        '--color-accent-glow': '#8b5cf6',
        '--color-surface': '#1e293b',
        '--color-background': '#0f172a',
    },
    cyberpunk: {
        '--color-primary': '312 100% 50%',
        '--color-primary-glow': '#ff00ff',
        '--color-accent-glow': '#00ffff',
        '--color-surface': '#120515',
        '--color-background': '#000000',
    },
    midnight: {
        '--color-primary': '260 100% 65%',
        '--color-primary-glow': '#a855f7',
        '--color-accent-glow': '#3b82f6',
        '--color-surface': '#0f1025',
        '--color-background': '#020210',
    },
    corporate: {
        '--color-primary': '150 100% 35%',
        '--color-primary-glow': '#10b981',
        '--color-accent-glow': '#064e3b',
        '--color-surface': '#18181b',
        '--color-background': '#09090b',
    },
    ocean: {
        '--color-primary': '190 90% 50%',
        '--color-primary-glow': '#06b6d4',
        '--color-accent-glow': '#3b82f6',
        '--color-surface': '#0c2436',
        '--color-background': '#04121f',
    }
};

const lightThemes: Record<Theme, Record<string, string>> = {
    default: {
        '--color-primary': '217 91% 60%',
        '--color-primary-glow': '#3b82f6',
        '--color-accent-glow': '#8b5cf6',
        '--color-surface': '#ffffff',
        '--color-background': '#f8fafc',
    },
    cyberpunk: {
        '--color-primary': '312 100% 50%',
        '--color-primary-glow': '#ff00ff',
        '--color-accent-glow': '#00ffff',
        '--color-surface': '#ffffff',
        '--color-background': '#fdf4ff',
    },
    midnight: {
        '--color-primary': '260 100% 65%',
        '--color-primary-glow': '#a855f7',
        '--color-accent-glow': '#3b82f6',
        '--color-surface': '#ffffff',
        '--color-background': '#faf5ff',
    },
    corporate: {
        '--color-primary': '150 100% 35%',
        '--color-primary-glow': '#10b981',
        '--color-accent-glow': '#064e3b',
        '--color-surface': '#ffffff',
        '--color-background': '#f0fdf4',
    },
    ocean: {
        '--color-primary': '190 90% 50%',
        '--color-primary-glow': '#06b6d4',
        '--color-accent-glow': '#3b82f6',
        '--color-surface': '#ffffff',
        '--color-background': '#ecfeff',
    }
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            currentTheme: 'default',
            isDarkMode: true,
            setTheme: (theme) => {
                set({ currentTheme: theme });
                get().applyTheme();
            },
            toggleDarkMode: () => {
                set({ isDarkMode: !get().isDarkMode });
                get().applyTheme();
            },
            setDarkMode: (isDark) => {
                set({ isDarkMode: isDark });
                get().applyTheme();
            },
            applyTheme: () => {
                const theme = get().currentTheme;
                const isDark = get().isDarkMode;
                const variables = isDark 
                    ? (themes[theme] || themes.default)
                    : (lightThemes[theme] || lightThemes.default);

                const root = document.documentElement;
                Object.entries(variables).forEach(([key, value]) => {
                    root.style.setProperty(key, value);
                });

                // Update body background based on mode
                if (isDark) {
                    document.body.style.backgroundColor = '#030712';
                    document.body.style.color = '#f8fafc';
                } else {
                    document.body.style.backgroundColor = '#f8fafc';
                    document.body.style.color = '#0f172a';
                }
            }
        }),
        {
            name: 'tradermind-theme-storage',
        }
    )
);
