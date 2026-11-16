const c = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        nav: c('nav'),
        raised: c('raised'),
        sunken: c('sunken'),
        line: c('line'),
        ink: c('ink'),
        muted: c('muted'),
        primary: c('primary'),
        'primary-ink': c('primary-ink'),
        'primary-soft': c('primary-soft'),
        accent: c('accent'),
        danger: c('danger'),
        s: {
          todo: c('s-todo'),
          progress: c('s-progress'),
          review: c('s-review'),
          blocked: c('s-blocked'),
          done: c('s-done'),
        },
        p: { low: c('p-low'), medium: c('p-medium'), high: c('p-high'), urgent: c('p-urgent') },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { sm: '4px', DEFAULT: '6px', md: '8px', lg: '12px' },
      boxShadow: { raise: 'var(--elev-1)', lift: 'var(--elev-2)', pop: 'var(--elev-3)' },
      zIndex: { sticky: '20', nav: '30', overlay: '40', modal: '50', toast: '60', tooltip: '70' },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      screens: { xs: '390px' },
    },
  },
  plugins: [],
}
