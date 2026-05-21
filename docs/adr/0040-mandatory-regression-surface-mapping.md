<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: 0040-mandatory-regression-surface-mapping.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Define the requirement for mapping the regression surface of every change to ensure stability and predict impact.
 * Traceability: Closes #113, #114
 * Status: Approved
 * ======================================================================== -->

# ADR 0040: Mandatory Regression Surface Mapping

## Context
As the Pharos ecosystem grows across multiple languages (Rust, TypeScript, C#) and platforms, the surface area for regressions increases significantly. A change in a core utility or schema (e.g., `pkd-core`) can have cascading effects on downstream consumers (e.g., `revit-bridge` or the `marketing` site) that are not immediately obvious during the implementation phase. Without a formal process to map these potential impact zones, the system risks "failing slowly"—where bugs persist in the environment for long periods before discovery.

## Decision
Every **Non-Trivial** change (as defined by ADR-0017) MUST include a **Regression Surface Map** as part of its Strategy phase.

1.  **Mapping Requirement**: The developer (human or agent) must explicitly list all modules, vertical slices, and invariant paths that could be affected by the proposed change.
2.  **Impact Assessment**: For each identified area, the map must state whether the impact is **Breaking**, **Additive**, or **Neutral**.
3.  **Verification Linkage**: The regression surface map must be used to inform the TDD strategy, ensuring that tests are written to guard not only the new feature but also the identified "at-risk" areas.
4.  **Documentation**: This map must be included in the "Fix Summary" or "PR Description" to provide Crucible auditors with a roadmap for verification.

## Rationale
Explicit mapping forces the developer to adopt a system-wide perspective before writing code. This shift-left approach to regression testing reduces technical debt, improves agentic continuity (by providing a clear handoff of "what might break"), and aligns with the project's **Fail Fast** philosophy. It ensures that stability is a first-class citizen rather than an afterthought.

## Impact
-   **Positive**: Significantly lower regression rates; improved confidence in cross-language FFI stability; clearer audit trails for PR reviews.
-   **Negative**: Adds a small amount of upfront design time (15-30 minutes) for complex features.
-   **Neutral**: Integrates directly into the existing ADR-0017 "Three-Option" workflow.
