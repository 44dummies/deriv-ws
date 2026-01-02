/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dynamic Theme Colors using HSL variables
                background: 'hsl(var(--color-background) / <alpha-value>)',
                surface: 'hsl(var(--color-surface) / <alpha-value>)',

                // Primary Neon Accents
                primary: {
                    DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
                    glow: 'var(--color-primary-glow)',
                    dim: 'hsl(var(--color-primary) / 0.5)',
                },
                accent: {
                    DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
                    glow: 'var(--color-accent-glow)',
                },
                success: {
                    DEFAULT: '#10b981', // Keep static for semantic status
                    glow: '#34d399',
                },
                danger: {
                    DEFAULT: '#ef4444',
                    glow: '#f87171',
                },

                // Glass Tints
                glass: {
                    100: 'rgba(255, 255, 255, 0.1)',
                    200: 'rgba(255, 255, 255, 0.2)',
                    300: 'rgba(255, 255, 255, 0.3)',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'ticker': 'ticker 30s linear infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'gradient-x': 'gradient-x 15s ease infinite',
                'gradient-y': 'gradient-y 15s ease infinite',
                'spin-slow': 'spin 8s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(14, 165, 233, 0.1)' },
                    '100%': { boxShadow: '0 0 20px var(--color-primary-glow), 0 0 10px var(--color-primary-glow)' },
                },
                ticker: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'gradient-x': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                'gradient-y': {
                    '0%, 100%': { backgroundPosition: '50% 0%' },
                    '50%': { backgroundPosition: '50% 100%' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                // Updated mesh to use var() if needed, but keeping simple for now
                'mesh': 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
            }
        },
    },
    plugins: [],
}
