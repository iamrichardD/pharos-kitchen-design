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
import fs from 'node:fs';
import path from 'node:path';

const updates = defineCollection({
  loader: async () => {
    const updatesDir = path.resolve('src/content/updates');
    const files = fs.readdirSync(updatesDir).filter(f => f.endsWith('.toon'));
    
    return files.map(file => {
      const id = file.replace('.toon', '');
      const filePath = path.join(updatesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract date from content (e.g., date: 2026-05-22)
      const dateMatch = content.match(/^date:\s*([\d-]+)/m);
      const date = dateMatch ? dateMatch[1] : '1970-01-01';
      
      return {
        id,
        content,
        date,
      };
    });
  },
  schema: z.object({
    id: z.string(),
    content: z.string(),
    date: z.string(),
  }),
});

export const collections = {
  'updates': updates,
};
