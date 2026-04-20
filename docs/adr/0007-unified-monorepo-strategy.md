<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0007-unified-monorepo-strategy.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: [Purpose]
 * Traceability: [Traceability]
 * Status: Approved
 * ======================================================================== -->

# ADR 0007: Unified Monorepo Strategy

## Context
Evaluating the use of Git Submodules vs. a Monorepo for the POC and Marketing sites.

## Decision
Selected a **Unified Monorepo** structure (`/apps/marketing`, `/apps/demo`, `/packages/pkd-core`).

## Rationale
Eliminates the "Coordination Friction" of Git Submodules. Enables **Atomic Commits**, ensuring that changes to the core `schema/` are immediately and safely reflected in both the Marketing documentation and the POC Demo in a single PR. Simplifies CI/CD by deploying both targets to a single GitHub Pages instance.

## Impact
- All future development will occur within this single repository.
- Internal package linking (e.g., `npm workspaces` or `pnpm`) will be used.
- Single root build pipeline for both Marketing and Demo.
