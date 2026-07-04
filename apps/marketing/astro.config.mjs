/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing Site
 * File: astro.config.mjs
 * Author: Richard D. (https://github.com/iamrichardd)
 * Purpose: Astro configuration for the IKD marketing hub.
 * Traceability: ADR 0012, ADR 0015, Issue #312
 * Last Updated: 2026-06-30
 * ======================================================================== */

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';
import { pharosRegistryPlugin } from './src/server/registryMiddleware.ts';
import { createLogger } from 'vite';

const customLogger = createLogger();
const originalWarn = customLogger.warn;
customLogger.warn = (msg, options) => {
  if (msg.includes('optimizeDeps.esbuildOptions')) {
    return;
  }
  originalWarn(msg, options);
};

// https://astro.build/config
export default defineConfig({
  site: 'https://iamrichardd.com',
  base: '/pharos-kitchen-design',
  outDir: './dist',
  publicDir: './public',
  output: 'static',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  markdown: {
    processor: satteri({
      features: {
        directive: true,
      },
    }),
  },
  integrations: [react()],
  vite: {
    customLogger,
    plugins: [tailwindcss(), pharosRegistryPlugin(fileURLToPath(new URL('.', import.meta.url)))],
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
