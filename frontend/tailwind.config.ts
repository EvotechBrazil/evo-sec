import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx,mjs}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-archivo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-archivo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        impact: ['Impact', 'Anton', '"Arial Narrow Bold"', 'sans-serif'],
      },
      colors: {
        nina: { 50: '#fefce8', 100: '#fef9c3', 400: '#facc15', 500: '#eab308', 600: '#ca8a04' },
        // Tremor — light tokens
        tremor: {
          brand: { faint: colors.yellow[50], muted: colors.yellow[200], subtle: colors.yellow[400], DEFAULT: colors.yellow[500], emphasis: colors.yellow[600], inverted: colors.black },
          background: { muted: colors.neutral[50], subtle: colors.neutral[100], DEFAULT: colors.white, emphasis: colors.neutral[700] },
          border: { DEFAULT: colors.neutral[200] },
          ring: { DEFAULT: colors.neutral[200] },
          content: { subtle: colors.neutral[400], DEFAULT: colors.neutral[500], emphasis: colors.neutral[700], strong: colors.neutral[900], inverted: colors.white },
        },
        // Tremor — dark tokens (tema do app)
        'dark-tremor': {
          brand: { faint: '#1a1407', muted: colors.yellow[900], subtle: colors.yellow[700], DEFAULT: colors.yellow[400], emphasis: colors.yellow[300], inverted: colors.black },
          background: { muted: '#0f0f10', subtle: colors.neutral[800], DEFAULT: colors.neutral[900], emphasis: colors.neutral[300] },
          border: { DEFAULT: 'rgba(255,255,255,0.06)' },
          ring: { DEFAULT: colors.neutral[800] },
          content: { subtle: colors.neutral[600], DEFAULT: colors.neutral[400], emphasis: colors.neutral[200], strong: colors.neutral[50], inverted: colors.black },
        },
      },
      boxShadow: {
        'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'dark-tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'dark-tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.4)',
        'dark-tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.4)',
      },
      borderRadius: {
        'tremor-small': '0.375rem',
        'tremor-default': '0.5rem',
        'tremor-full': '9999px',
      },
      fontSize: {
        'tremor-label': ['0.75rem', { lineHeight: '1rem' }],
        'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
        'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
        'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
      },
    },
  },
  safelist: [
    { pattern: /^(bg|text|border|ring|stroke|fill)-(yellow|amber|emerald|red|rose|slate|neutral|blue|violet|cyan|indigo)-(50|100|200|300|400|500|600|700|800|900|950)$/, variants: ['hover', 'ui-selected'] },
  ],
  plugins: [],
};

export default config;
