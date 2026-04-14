/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Governance / Contribution Standards
 * File: CONTRIBUTING.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Formalizing the "Fix Summary" and "Mentorship" mandates.
 * ======================================================================== */

# Contributing to Pharos Kitchen Design

Thank you for contributing to Project Prism. To maintain our "Metadata-First Truth" and avoid "BIM Bloat," all contributors (Human and AI) must adhere to the following high-rigor standards.

## 🎯 The "Fix Summary" Mandate
Every Pull Request MUST include a **Fix Summary** section. This is not an optional implementation note; it is the logical authority for the change.

### Requirements:
1.  **Conciseness**: Maximum signal, minimum noise.
2.  **Brutal Honesty**: Explicitly state what was fixed, what was traded off (technical debt), and any residual risks.
3.  **DORA Alignment**: Include Lead Time and Change Failure Rate (verified via Podman).
4.  **Traceability**: Link to the GitHub Issue and any relevant ADRs.

## 🎓 Pharos Handover & Mentorship Protocol
We treat every PR as a teaching tool. Code is "AI Slop" if it lacks the **Why**.

1.  **No Meta-Labels**: Avoid labels like "The Why/How" or "Teachable Moment."
2.  **Integrated Rationale**: Weave the technical rationale, safety implications, and architectural tradeoffs directly into the code comments and PR critique.
3.  **Platform Empathy**: Follow the idiomatic standards of the target language (e.g., PascalCase BDD for C#, snake_case for Rust).

## 🛡️ Shift-Left Security
- **Input Validation**: Enforce size limits (e.g., 1MB) and type safety at all FFI/IPC boundaries.
- **Zero-Host Execution**: All changes MUST be verified in a **Podman container** using the project's `Containerfile` suite.
- **Fail Fast**: Detect defects immediately at the source. Never return null or empty defaults for critical configuration.

## 🚀 Workflow
1.  **Issue First**: Every change begins with a GitHub Issue.
2.  **Crucible-Slice**: For non-trivial tasks, evaluate three implementation options (ADR-0017).
3.  **Atomic Verification**: Every change requires a new, semantic BDD test (`TestShould_X_When_Y`).
