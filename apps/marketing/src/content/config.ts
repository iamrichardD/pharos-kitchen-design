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
import { glob } from 'astro/loaders';
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
      
      return {
        id,
        content,
      };
    });
  },
  schema: z.object({
    id: z.string(),
    content: z.string(),
  }),
});

export const collections = {
  'updates': updates,
};
