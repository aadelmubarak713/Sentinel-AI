/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep SOC palette — near-black/navy backgrounds
        ink: {
          950: '#070b12',
          900: '#0a1018',
          850: '#0d141f',
          800: '#101824',
          750: '#141d2b',
          700: '#1a2434',
          600: '#222e42',
          500: '#2c3a52',
          400: '#3c4a64',
        },
        // Restrained cyan accent
        cyan: {
          DEFAULT: '#22d3ee',
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
        },
        // Severity semantic colors
        critical: {
          DEFAULT: '#ef4444',
          bg: '#3a1213',
          border: '#5a1d1f',
        },
        warning: {
          DEFAULT: '#f59e0b',
          bg: '#3a2a0e',
          border: '#5a3f15',
        },
        success: {
          DEFAULT: '#10b981',
          bg: '#0c2a1f',
          border: '#154534',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'soc-card': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        'soc-glow': '0 0 0 1px rgba(34,211,238,0.18), 0 0 24px -6px rgba(34,211,238,0.25)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
