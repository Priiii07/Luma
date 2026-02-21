/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderWidth: {
        '3': '3px'
      },
      colors: {
        ember: {
          bg: '#0d0d12',
          card: '#1a1a1f',
          surface: 'rgba(255,255,255,0.04)',
          purple: '#c678dd',
          'purple-dark': '#9b4db0',
          'purple-light': '#d088ed',
          terracotta: '#dc643c',
        }
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
