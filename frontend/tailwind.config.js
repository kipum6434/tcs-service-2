/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1B3A6B', light: '#2563EB' },
        teal:  { DEFAULT: '#0D9488' },
      },
    },
  },
  plugins: [],
};
