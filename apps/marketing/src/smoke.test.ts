/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing Site
 * File: src/smoke.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: High-Rigor verification of workspace resolution and WASM bridge entry point.
 * Traceability: Issue #33, ADR 0002, ADR 0017
 * ======================================================================== */

import { describe, it, expect } from 'vitest';
// High-Rigor: Import via workspace package name, not relative path
import * as pkdCore from '@pkd/core';
import schema from '@pkd/core/schema/pharos-schema.json';
import { roadmapItems } from './data/roadmap';
import { categories } from './data/categories';

describe('Marketing Site Monorepo Integrity', () => {
  it('should resolve @pkd/core package via npm workspaces', () => {
    expect(pkdCore).toBeDefined();
  });

  it('should resolve and import the core pharos-schema from @pkd/core', () => {
    expect(schema).toBeDefined();
    expect(schema.pkd_prologue.project).toBe('Pharos Kitchen Design (Project Prism)');
  });

  it('should expose the WASM validation entry point', () => {
    // We verify the export exists, confirming the TS/WASM bridge is linked
    expect(pkdCore.validate_metadata_wasm).toBeDefined();
  });
});

describe('Marketing Data Integrity (Issue #71)', () => {
  it('should have Warewashing as a Verified category (Option A)', () => {
    const warewashing = categories.find(c => c.name === 'Warewashing');
    expect(warewashing).toBeDefined();
    expect(warewashing?.fidelity).toBe('verified');
  });

  it('should have Sprint 4 items marked as In Construction (Option A)', () => {
    const sprint4Items = roadmapItems.filter(i => i.phase === 'Sprint 4');
    expect(sprint4Items.length).toBeGreaterThan(0);
    sprint4Items.forEach(item => {
      expect(item.status).toBe('In Construction');
    });
  });

  it('should have Manufacturer-Verified Specs marked as Deployed', () => {
    const specs = roadmapItems.find(i => i.name === 'Manufacturer-Verified Specs');
    expect(specs?.status).toBe('Deployed');
  });
});
