/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#0a0d14',
          card: '#111726',
          border: '#1e293b',
          accent: '#06b6d4',
          alert: '#f43f5e',
          success: '#10b981',
          warning: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
