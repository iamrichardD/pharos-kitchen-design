/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Tailwind Config
 * File: tailwind.config.mjs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Tailwind configuration for the demo app, inheriting marketing theme tokens.
 * Traceability: Issue #28, Issue #235
 * Last Updated: 2026-06-12
 * ======================================================================== */

import baseConfig from '../marketing/tailwind.config.mjs';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
};
