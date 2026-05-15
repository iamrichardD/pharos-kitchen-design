/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Content
 * File: apps/marketing/src/content/config.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Content collection configuration for the Pharos Pulse Blog.
 * Traceability: Issue #129
 * ======================================================================== */

import { defineCollection, z } from 'astro:content';

const updates = defineCollection({
  type: 'data',
  schema: z.string(), // We store the raw TOON content as a string
});

export const collections = {
  'updates': updates,
};
