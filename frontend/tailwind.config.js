/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        ink: {
          50: '#020617',
          100: '#0f172a',
          200: '#1e293b',
          300: '#334155',
          400: '#475569',
          500: '#64748b',
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0',
          900: '#f1f5f9',
          950: '#ffffff',
        },
        risk: {
          low: '#10b981',
          med: '#f59e0b',
          high: '#ef4444',
          crit: '#b91c1c',
        },
      },
      backgroundImage: {
        'shell-gradient':
          'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        'panel-sheen':
          'linear-gradient(180deg, rgba(15,23,42,0.03) 0%, rgba(15,23,42,0.01) 100%)',
        'auth-gradient':
          'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      },
      boxShadow: {
        glass:
          '0 10px 30px -16px rgba(15, 23, 42, 0.24), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
        'glass-lg':
          '0 25px 60px -28px rgba(15, 23, 42, 0.28), 0 1px 0 rgba(255, 255, 255, 0.9) inset',
        ring: '0 0 0 1px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        glass: '1.25rem',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
