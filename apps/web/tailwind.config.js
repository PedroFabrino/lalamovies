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
        cinema: {
          950: '#020617',
          900: '#090d16',
          850: '#0d1118',
          800: '#111620',
          750: '#161c28',
        },
        accent: {
          violet: '#8b5cf6',
          indigo: '#6366f1',
          neon: '#a855f7',
        },
        success: {
          DEFAULT: '#10b981',
          glow: '#34d399',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'bar-stripes': 'bar-stripes 1s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'countdown-pulse': 'countdown-pulse 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px 0 rgba(16, 185, 129, 0.6)' },
          '50%': { opacity: '0.6', boxShadow: '0 0 16px 2px rgba(16, 185, 129, 0.8)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'bar-stripes': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        },
        'countdown-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
