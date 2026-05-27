/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo Application / CI
 * File: vitest.config.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Explicit Vitest configuration for the Astro demo application.
 * Traceability: ADR 0017
 * ======================================================================== */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
  },
  esbuild: {
    jsx: 'automatic',
  }
});
