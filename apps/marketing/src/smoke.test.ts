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
const roadmapItems = Array.from(rawToon.matchAll(/^\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/gm)).map(m => ({
  id: m[1],
  name: m[2],
  status: m[3],
  phase: m[4],
  tag: m[5],
  description: m[6]
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

  it('test_should_mark_active_sprint_items_as_valid_when_synchronized', () => {
    // Verify that we have both Deployed and In Progress items across the active backlog
    const statuses = roadmapItems.map(i => i.status);
    expect(statuses).toContain('Deployed');
    expect(statuses).toContain('In Progress');
  });

  it('test_should_mark_identity_replatforming_as_deployed_when_sync_engine_runs', () => {
    const identity = roadmapItems.find(i => i.name === 'Identity Re-platforming');
    expect(identity?.status).toBe('Deployed');
  });
});
