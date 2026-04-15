/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo Application
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

describe('Demo App Monorepo Integrity', () => {
  it('should resolve @pkd/core package via npm workspaces', () => {
    expect(pkdCore).toBeDefined();
  });

  it('should resolve and import the core pharos-schema from @pkd/core', () => {
    expect(schema).toBeDefined();
    expect(schema.pkd_prologue.project).toBe('Pharos Kitchen Design (Project Prism)');
  });

  it('should expose the WASM validation entry point', () => {
    expect(pkdCore.validate_metadata_wasm).toBeDefined();
  });
});
