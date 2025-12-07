/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deriv: {
          red: '#ff444f',
          dark: '#0e0e0e',
          gray: {
            light: '#f5f7fa',
            DEFAULT: '#999999',
            dark: '#333333',
          }
        },
        gray: {
          950: '#0a0a0f',
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
