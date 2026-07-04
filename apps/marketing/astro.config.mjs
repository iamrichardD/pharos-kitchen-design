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
  integrations: [
    react({
      disableOxcRecommendation: true
    })
  ],
  vite: {
    plugins: [
      {
        name: 'pre-clean-react-babel-esbuild',
        enforce: 'pre',
        config(config) {
          // Find the react-babel plugin in config and strip its deprecated config return
          const babelPlugin = config.plugins?.find(p => p && p.name === 'vite:react-babel');
          if (babelPlugin && typeof babelPlugin.config === 'function') {
            const originalConfig = babelPlugin.config;
            babelPlugin.config = function(...args) {
              const res = originalConfig.apply(this, args);
              if (res) {
                delete res.esbuild;
                if (res.optimizeDeps && res.optimizeDeps.esbuildOptions) {
                  delete res.optimizeDeps.esbuildOptions;
                }
              }
              return res;
            };
          }
        }
      },
      tailwindcss(),
      pharosRegistryPlugin(fileURLToPath(new URL('.', import.meta.url)))
    ],
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
