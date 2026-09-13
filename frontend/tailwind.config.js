/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f2',
          100: '#fde8e8',
          600: '#e02424',
          700: '#c81e1e',
        }
      }
    },
  },
  plugins: [],
}