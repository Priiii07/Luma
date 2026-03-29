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
          bg: '#1F1B2E',
          card: '#2D2842',
          surface: 'rgba(255,255,255,0.06)',
          purple: '#B388FF',
          'purple-dark': '#9B6FDD',
          'purple-light': '#D0B3FF',
          terracotta: '#dc643c',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
