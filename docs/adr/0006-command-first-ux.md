/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0006-command-first-ux.md
 * Status: Approved
 * ======================================================================== */

# ADR 0006: Command-First UX (Hybrid Spotlight)

## Context
Designing the interaction model for the Independent Kitchen Designer (IKD) to eliminate legacy search-and-click "toil."

## Decision
Selected a **Hybrid Spotlight (Command Palette)** as the primary UX. Designers find equipment via semantic intent (e.g., typing "208v Hobart") rather than categorical tree navigation.

## Rationale
Minimizes the "Job to be Done" cycle from minutes to seconds. Provides a high-performance "expert tool" feel that empowers the user. The typed intent simplifies future AI-driven selection and automation.

## Impact
- The Astro frontend will prioritize a central search/palette interface (`Cmd+K`).
- WASM previews and metadata validation will live-update as the user types.
