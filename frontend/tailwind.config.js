/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Enterprise / Dark Theme Base
                background: '#030712', // rich black
                surface: '#0f172a',    // slate 900

                // Neon Accents
                primary: {
                    DEFAULT: '#0ea5e9', // Sky 500
                    glow: '#38bdf8',    // Sky 400
                    dim: '#0369a1',     // Sky 700
                },
                accent: {
                    DEFAULT: '#8b5cf6', // Violet 500
                    glow: '#a78bfa',    // Violet 400
                },
                success: {
                    DEFAULT: '#10b981', // Emerald 500
                    glow: '#34d399',    // Emerald 400
                },
                danger: {
                    DEFAULT: '#ef4444', // Red 500
                    glow: '#f87171',    // Red 400
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
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(14, 165, 233, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(56, 189, 248, 0.6), 0 0 10px rgba(56, 189, 248, 0.4)' },
                },
                ticker: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-100%)' },
                }
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'mesh': 'radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)',
            }
        },
    },
    plugins: [],
}
