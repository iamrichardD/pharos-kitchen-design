/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'ph-charcoal': 'rgb(var(--ph-charcoal))',
        'ph-orange': 'rgb(var(--ph-orange))',
        'ph-blue': 'rgb(var(--ph-blue))',
        'bg-base': 'rgb(var(--bg-base))',
        'text-base': 'rgb(var(--text-base))',
        'text-muted': 'rgb(var(--text-muted))',
        'grid-line': 'rgb(var(--grid-line))',
        'border-blueprint': 'rgb(var(--border-blueprint))',
      },
      fontFamily: {
        'condensed': ['Roboto Condensed', 'sans-serif'],
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
