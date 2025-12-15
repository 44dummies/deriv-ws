/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        liquid: { // Keeping for legacy compatibility but remapping to new theme
          bg: '#0E0E0E',
          card: 'rgba(21, 23, 27, 0.6)',
          border: 'rgba(255, 255, 255, 0.05)',
          accent: '#FF444F', // Deriv Red
          secondary: '#85ACB0', // Deriv Blue-Gray
          success: '#4bb4b3', // Deriv Teal
          warning: '#ffad3a',
          text: {
            main: '#FFFFFF',
            muted: '#d6d6d6',
            dim: '#999999',
          }
        },
        brand: {
          red: '#FF444F',
          redHover: '#eb3e48',
          dark: '#0E0E0E',
          darker: '#080808',
          card: '#15171B',
          gray: {
            50: '#f7f7f7',
            100: '#e6e6e6',
            200: '#cccccc',
            300: '#b3b3b3',
            400: '#999999',
            500: '#808080',
            600: '#666666',
            700: '#4d4d4d',
            800: '#333333',
            900: '#1a1a1a',
          }
        }
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
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      },
    },
  },
  plugins: [],
}
