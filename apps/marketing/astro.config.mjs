/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing Site
 * File: astro.config.mjs
 * Author: Richard D. (https://github.com/iamrichardd)
 * Purpose: Astro configuration for the IKD marketing hub.
 * Traceability: ADR 0012, ADR 0015
 * ======================================================================== */

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';

// https://astro.build/config
export default defineConfig({
  site: 'https://iamrichardd.com',
  base: '/pharos-kitchen-design',
  outDir: './dist',
  publicDir: './public',
  output: 'static',
  markdown: {
    processor: satteri({
      features: {
        directive: true,
      },
    }),
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
