/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing Site
 * File: astro.config.mjs
 * Author: Richard D. (https://github.com/iamrichardd)
 * Purpose: Astro configuration for the IKD marketing hub.
 * Traceability: ADR 0012, ADR 0015
 * ======================================================================== */

import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://iamrichardd.com',
  base: '/pharos-kitchen-design',
  outDir: './dist',
  publicDir: './public',
  output: 'static',
  integrations: [tailwind()],
});
