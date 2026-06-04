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
import { categories } from './data/categories';
import fs from 'node:fs';
import path from 'node:path';

// Load automated roadmap data for testing
const TOON_PATH = path.resolve(__dirname, 'content/roadmap.toon');
const rawToon = fs.readFileSync(TOON_PATH, 'utf-8');
const roadmapItems = Array.from(rawToon.matchAll(/^\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/gm)).map(m => ({
  name: m[1],
  status: m[2],
  phase: m[3],
  tag: m[4],
  description: m[5]
}));

describe('Marketing Site Monorepo Integrity', () => {
  /**
   * Why: Ensures the marketing site is correctly linked to the shared logic core.
   */
  it('test_should_resolve_pkd_core_when_imported_via_workspaces', () => {
    expect(pkdCore).toBeDefined();
  });

  it('test_should_resolve_pharos_schema_when_imported_from_core', () => {
    expect(schema).toBeDefined();
    expect(schema.pkd_prologue.project).toBe('Pharos Kitchen Design (Project Prism)');
  });

  it('test_should_expose_wasm_validation_when_core_is_linked', () => {
    // We verify the export exists, confirming the TS/WASM bridge is linked
    expect(pkdCore.validate_metadata_wasm).toBeDefined();
  });
});

/**
 * Why: Verifies that the marketing site data manifests are synchronized with the 
 * high-fidelity technical core (Phase 4). Prevents narrative drift from engineering reality.
 */
describe('Marketing Data Integrity (Issue #71)', () => {
  it('test_should_mark_warewashing_as_verified_when_category_exists', () => {
    const warewashing = categories.find(c => c.name === 'Warewashing');
    expect(warewashing).toBeDefined();
    expect(warewashing?.fidelity).toBe('verified');
  });

  it('test_should_mark_sprint_4_items_as_in_construction_when_state_is_active', () => {
    const sprint4Items = roadmapItems.filter(i => i.phase === 'Sprint 4');
    expect(sprint4Items.length).toBeGreaterThan(0);
    sprint4Items.forEach(item => {
      expect(item.status).toBe('In Construction');
    });
  });

  it('test_should_mark_manufacturer_specs_as_deployed_when_sprint_3_is_complete', () => {
    const specs = roadmapItems.find(i => i.name === 'Manufacturer-Verified Specs');
    expect(specs?.status).toBe('Deployed');
  });
});
