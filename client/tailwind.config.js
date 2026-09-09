/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        netease: {
          red: 'rgb(var(--om-accent-rgb) / <alpha-value>)',
          dark: 'rgb(var(--om-canvas-rgb) / <alpha-value>)',
          bg: 'rgb(var(--om-surface-rgb) / <alpha-value>)',
          card: 'rgb(var(--om-surface-raised-rgb) / <alpha-value>)',
          hover: 'rgb(var(--om-surface-hover-rgb) / <alpha-value>)',
          border: 'rgb(var(--om-border-rgb) / <alpha-value>)',
          muted: 'rgb(var(--om-muted-rgb) / <alpha-value>)',
        },
        surface: {
          canvas: 'rgb(var(--om-canvas-rgb) / <alpha-value>)',
          base: 'rgb(var(--om-surface-rgb) / <alpha-value>)',
          raised: 'rgb(var(--om-surface-raised-rgb) / <alpha-value>)',
          hover: 'rgb(var(--om-surface-hover-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'vinyl-spin': 'vinylSpin 24s linear infinite',
        equalizer: 'equalizer 0.8s ease-in-out infinite alternate',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
        'ping-slow': 'pingSlow 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'gradient-x': 'gradientX 6s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        vinylSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        equalizer: {
          '0%': { height: '4px' },
          '100%': { height: '24px' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.02)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        pingSlow: {
          '0%': { transform: 'scale(1)', opacity: '0.4' },
          '75%, 100%': { transform: 'scale(1.15)', opacity: '0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
