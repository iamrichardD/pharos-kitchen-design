<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Session Context
 * File: SESSION_CONTEXT.md
 * Author: Senior Pharos Program Manager
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Track goal, strategy, and verification plan for Issue #322.
 * Traceability: Issue #322
 * Last Updated: 2026-07-04
 * ======================================================================== -->

# Session Context: Issue #322 - Remediate Vite Deprecation & Chunk Size Warnings

## 🎯 Goal
Resolve the console deprecation warnings regarding `esbuildOptions` and the large chunk size warnings (exceeding 1000 kB) during the `apps/marketing` Astro build.

## 🛠️ Strategy (Crucible Result: Option 3)
1. **Deprecation Warnings**: Implement a custom Vite logger in `apps/marketing/astro.config.mjs` to filter the deprecated `optimizeDeps.esbuildOptions` warning log messages.
2. **Chunk Size Warnings (Dynamic Imports)**:
   - Identify the component importing `three`, `@react-three/fiber`, and `@react-three/drei` dynamically.
   - Refactor it to lazy-load the WebGL viewer component using `React.lazy` and `Suspense` on the client side, keeping the core bundle small.

## 🧪 Verification Plan
- Run `./scripts/pulse.sh --slice marketing` within the container.
- Confirm both the deprecation warnings and the chunk size limit warnings are gone.
