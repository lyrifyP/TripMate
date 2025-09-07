/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 10px 30px rgba(0,0,0,0.07)',
        tile: '0 6px 18px rgba(0,0,0,0.06)',
        soft: '0 4px 14px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
