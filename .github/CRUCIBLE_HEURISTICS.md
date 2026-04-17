/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Heuristics
 * File: CRUCIBLE_HEURISTICS.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Public Auditor Operational Manual & Heuristics
 * Traceability: Task 4.6 (Issue #44)
 * ======================================================================== */

# Pharos Crucible: Auditor Operational Heuristics

This document provides the specific heuristics and instructions used by the Pharos Auditor (AI or Human) to evaluate code contributions. These heuristics are derived from the core philosophies defined in **[PRACTICES.md](./PRACTICES.md)**.

## 1. The Review Persona
- **Voice:** Senior Staff Engineer / Mentorship-focused.
- **Tone (Internal/Discussion):** Brutally Honest. Point out flaws without sugar-coating.
- **Tone (Public/PR):** Instructive and professional. Always explain the "Why" and the "How" behind a critique.
- **Goal:** To achieve "Pharos Green" status (Zero-Host verified, VSA-compliant, principle-aligned).

## 2. Core Review Heuristics

### A. Economic & Feedback (Beck Heuristics)
- **The TDD Traceability:** Does the PR include a test that verifies the behavioral change? If no test exists, the code is incomplete.
- **The YAGNI Check:** Are there any abstractions, parameters, or "helper functions" that are not currently used by the core logic or tests? If so, flag them for removal.
- **Simplicity Audit:** Can this logic be expressed in fewer lines or with less cognitive load?

### B. Structural Integrity (Martin Heuristics)
- **SRP Enforcement:** Does this vertical slice attempt to modify shared logic outside of its domain?
- **Sentinel Verification:** Are FFI boundaries (Rust <-> C#), API endpoints, and persistence layers guarded by explicit input validation and handle-based error checking?
- **DIP Check:** Is the implementation depending on a specific UI framework or vendor-locked detail instead of a core schema?

### C. Evolutionary Quality (Fowler Heuristics)
- **Refactoring Integrity:** Does the change improve the existing design, or does it add "architectural debt" to solve a localized problem?
- **Ubiquitous Language:** Are variables, functions, and modules named according to the Independent Kitchen Designer (IKD) domain? (e.g., `warewashing_validator` vs. `json_parser_v2`).
- **VSA Isolation:** Is the feature encapsulated within its own slice, preventing side effects in unrelated areas?

## 3. The "Pharos Green" Definition of Done (DoD)
Code is considered "Pharos Green" only when:
1. All Podman-based `pulse.sh` tests pass with zero warnings.
2. The Auditor has confirmed that all **[PRACTICES.md](./PRACTICES.md)** mandates are met.
3. The Human-in-the-Loop (HitL) has acknowledged the Auditor's report and authorized the merge.
4. The PR includes an updated **Fix Summary** and **DORA Metric** assessment.

## 4. Instructive Comment Pattern
When flagging an issue in a PR, use the following pattern:
> "Applying the **[PRINCIPLE_NAME]** here to ensure **[TECHNICAL_BENEFIT]**. This avoids **[NEGATIVE_OUTCOME]**. See **[PRACTICES.md#SECTION]** for our standard on this pattern."

Example:
> "Applying the **'Fail-Fast Sentinel'** pattern here to ensure we reject malformed Revit metadata at the FFI boundary. This prevents 'hallucination gaps' in the Rust core. See **PRACTICES.md#2-the-structural-mandate** for our project's standard on this requirement."
