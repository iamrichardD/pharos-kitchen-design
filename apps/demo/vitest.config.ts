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

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
