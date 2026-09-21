const c = (v) => `rgb(var(--c-${v}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: c('paper'),
        surface: c('surface'),
        sunken: c('sunken'),
        line: c('line'),
        ink: c('ink'),
        muted: c('muted'),
        accent: c('accent'),
        'accent-ink': c('accent-ink'),
        ok: c('ok'),
        warn: c('warn'),
        danger: c('danger'),
      },
      fontFamily: {
        sans: ['"Figtree Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Figtree Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        sheet: { from: { opacity: 0, transform: 'translateY(24px)' }, to: { opacity: 1, transform: 'none' } },
        toast: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'none' } },
        tick: { from: { strokeDashoffset: 24 }, to: { strokeDashoffset: 0 } },
      },
      animation: {
        fade: 'fade .18s ease-out',
        sheet: 'sheet .22s cubic-bezier(.2,.8,.2,1)',
        toast: 'toast .22s ease-out',
        tick: 'tick .25s ease-out forwards',
      },
    },
  },
  plugins: [],
}
