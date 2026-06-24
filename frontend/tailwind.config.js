/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#0b1220',
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
          'linear-gradient(180deg, #f7fafc 0%, #eef4f8 100%)',
        'panel-sheen':
          'linear-gradient(180deg, rgba(8,145,178,0.04) 0%, rgba(15,23,42,0.01) 100%)',
        'auth-gradient':
          'linear-gradient(135deg, #0b1220 0%, #123447 54%, #f7fafc 54%, #ffffff 100%)',
      },
      boxShadow: {
        glass:
          '0 10px 24px -18px rgba(15, 23, 42, 0.32)',
        'glass-lg':
          '0 24px 54px -34px rgba(11, 18, 32, 0.38)',
        ring: '0 0 0 1px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        glass: '0.5rem',
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
