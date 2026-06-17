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
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
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
          'radial-gradient(1200px 600px at -10% -20%, rgba(99, 102, 241, 0.35), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(56, 189, 248, 0.22), transparent 60%), linear-gradient(160deg, #0b1020 0%, #0f172a 55%, #1e1b4b 100%)',
        'panel-sheen':
          'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
        'auth-gradient':
          'radial-gradient(1000px 500px at 0% 0%, rgba(99, 102, 241, 0.45), transparent 55%), radial-gradient(800px 400px at 100% 100%, rgba(14, 165, 233, 0.35), transparent 50%), linear-gradient(135deg, #0b1020 0%, #1e1b4b 100%)',
      },
      boxShadow: {
        glass:
          '0 10px 30px -10px rgba(2, 6, 23, 0.45), 0 1px 0 rgba(255, 255, 255, 0.05) inset',
        'glass-lg':
          '0 25px 60px -20px rgba(2, 6, 23, 0.55), 0 1px 0 rgba(255, 255, 255, 0.06) inset',
        ring: '0 0 0 1px rgba(255, 255, 255, 0.08)',
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
