/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Config
 * File: astro.config.mjs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Astro configuration for the demo app, integrating React and Tailwind.
 * Traceability: Issue #28, Issue #235
 * Last Updated: 2026-06-12
 * ======================================================================== */

import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  base: '/pharos-kitchen-design/demo',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
