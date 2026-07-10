/**
 * Shared Tailwind preset for UtanStore.
 * Storefront themes are data-driven via CSS variables (see ThemeProvider),
 * so colors here map to CSS custom properties that themes override at runtime.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Theme-driven tokens (overridden per-store via CSS variables)
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          fg: 'rgb(var(--color-brand-fg) / <alpha-value>)',
        },
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
      },
      fontFamily: {
        heading: 'var(--font-heading, ui-sans-serif, system-ui)',
        body: 'var(--font-body, ui-sans-serif, system-ui)',
      },
      borderRadius: {
        theme: 'var(--radius-theme, 0.5rem)',
      },
    },
  },
  plugins: [],
};
