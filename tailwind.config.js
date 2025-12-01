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
        }
      }
    },
  },
  plugins: [],
}
