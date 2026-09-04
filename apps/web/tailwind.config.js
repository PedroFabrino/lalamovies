/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border, 215 27.9% 16.9%))',
        background: 'hsl(var(--background, 222.2 84% 4.9%))',
        foreground: 'hsl(var(--foreground, 210 40% 98%))',
      },
    },
  },
  plugins: [],
};
