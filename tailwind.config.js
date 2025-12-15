/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        liquid: {
          bg: '#05070a', // Deep void background
          card: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#00D1FF', // Electric Blue
          secondary: '#7928CA', // Deep Purple
          success: '#00FF94', // Neon Green
          warning: '#FF0080', // Hot Pink (Liquid style warning)
          text: {
            main: '#FFFFFF',
            muted: 'rgba(255, 255, 255, 0.6)',
            dim: 'rgba(255, 255, 255, 0.3)',
          }
        },
        deriv: {
          red: '#ff444f',
          dark: '#0e0e0e',
          gray: {
            light: '#f5f7fa',
            DEFAULT: '#999999',
            dark: '#333333',
          }
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        xxl: '40px',
      },
      animation: {
        'blob': 'blob 10s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 209, 255, 0.4)' },
          '50%': { opacity: '0.5', boxShadow: '0 0 10px rgba(0, 209, 255, 0.1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      },
    },
  },
  plugins: [],
}
