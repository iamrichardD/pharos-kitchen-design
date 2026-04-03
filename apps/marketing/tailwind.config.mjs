/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'ph-charcoal': '#1A1A1A',
        'ph-orange': '#FF6B00',
        'ph-blue': '#005FB8',
      },
      fontFamily: {
        'condensed': ['Roboto Condensed', 'sans-serif'],
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
