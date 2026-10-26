/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ermeto: {
          DEFAULT: '#00305B',
          dark: '#001F3D',
          darker: '#001529',
          light: '#004B8D',
          accent: '#00A3E0',
          surface: '#F4F7FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'ermeto': '0 10px 30px -5px rgba(0, 48, 91, 0.15)',
        'ermeto-lg': '0 20px 40px -10px rgba(0, 48, 91, 0.25)',
      }
    },
  },
  plugins: [],
}
