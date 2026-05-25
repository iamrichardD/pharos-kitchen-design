# Crucible Audit Log: Shard #122.4 (Web Interpreter)

**Audit Date:** 2026-05-13
**Auditor:** PHAROS_STRATEGY_CORE (Antagonistic Mentor)
**Status:** 🟡 AMBER (Remediate)
**PR:** #157
**Implementation:** `ThreeJsInterpreter.tsx` + `demo-geometry.astro`

## 1. Post-Hoc Crucible (ADR-0017 Violation)
**Failure:** The builder implemented the "comfortable" path (React + R3F) without evaluating alternatives. This is a process breach.

| Option | Pros | Cons | Verdict |
| :--- | :--- | :--- | :--- |
| **React + R3F** | High DX, rapid prototyping, fits existing stack. | Significant bundle overhead (React + Fiber + Drei), tight coupling to React lifecycle. | **Chosen (Unvetted)** |
| **Vanilla Three.js** | Framework agnostic, minimal overhead, better performance control. | More boilerplate for state synchronization. | **Strong Contender** |
| **WASM Bridge** | Matches Pharos "Compute-First" ethos, shared logic with Rust core. | High initial complexity for simple extrusions. | **Strategic Target** |

**Mentorship:** Velocity is a siren song that often leads to architectural debt. By skipping the Crucible, you've coupled our visual representation to the React reconciler. While acceptable for a prototype, this lacks the "Loom of Truth" rigor we demand.

## 2. Architectural Audit
- **Coordinate Mapping:** The implementation hardcodes `Input X/Y/Z` to `Three.js X/Z/Y`. While mathematically correct for a Z-up BIM source, it is a "magic mapping" that fails to account for rotation or coordinate system hand-off (Right-handed vs Left-handed).
- **Hardcoded Materials:** `MaterialMap` is a static object. This belongs in a Registry or should be part of the Manifest metadata.

## 3. Security Audit
- **Validation Gap:** The interpreter blindly trusts the `GeometryManifest`. 
  - Missing `origin` or `dimensions` will result in `NaN` positions, potentially crashing the WebGL context or causing ghost renders.
  - No upper bound on `operations.length`. Vulnerable to Client-side DoS via "Geometry Bomb".
- **ReDoS:** No regex identified in parsing; logic is safe but naive.

## 4. Gap Analysis & DX
- **Contract Drift:** The `GeometryOperation` interface is duplicated in the UI component. This violates the "One Source of Truth" principle. These types MUST be imported from `@pkd/protocol`.
- **Extensibility:** The `OperationMesh` component is a closed switch. Adding new primitives (Cylinders, Meshes) requires modification of the core interpreter.

## 5. IA Review
- **Placement:** `demo-geometry.astro` is located in `apps/marketing/src/pages/`. 
  - **Risk:** This exposes internal technical verification routes to public search engines. 
  - **Correction:** Move to a `internal/` or `_debug/` route, or wrap in an environment guard.

---

## Final Determination: 🟡 AMBER
The implementation is functional but "lazy". It prioritizes surface-level aesthetics over structural integrity.

### Required Remediation:
1.  **Type Centralization:** Move `GeometryManifest` and `GeometryOperation` to `@pkd/protocol`.
2.  **Schema Validation:** Use `zod` or a similar validator to check the manifest before rendering.
3.  **Coordinate Abstraction:** Replace magic array indexing with a `CoordinateTransformer` utility.
4.  **Route Protection:** Relocate the demo page to avoid public indexing.
