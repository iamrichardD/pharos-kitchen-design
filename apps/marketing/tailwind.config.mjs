/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'ph-charcoal': 'var(--ph-charcoal)',
        'ph-orange': 'var(--ph-orange)',
        'ph-blue': 'var(--ph-blue)',
        'bg-base': 'var(--bg-base)',
        'text-base': 'var(--text-base)',
        'text-muted': 'var(--text-muted)',
        'grid-line': 'var(--grid-line)',
        'border-blueprint': 'var(--border-blueprint)',
      },
      fontFamily: {
        'condensed': ['Roboto Condensed', 'sans-serif'],
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
