/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0006-command-first-ux.md
 * Status: Approved (Refined for Phase 3)
 * Traceability: Issue #10, ADR 0009, ADR 0015
 * ======================================================================== */

# ADR 0006: Command-First UX (The Three Pillars)

## Context
Designing the interaction model for the Independent Kitchen Designer (IKD) to eliminate legacy search-and-click "toil" across desktop, web, and BIM environments.

## Decision
Selected a **Unified Command Language (UCL)** as the primary UX philosophy. This manifests in three identical modalities:

1.  **Binary CLI (`pkd`):** A high-performance Rust executable for local filesystem operations, headless automation, and CI/CD integration.
2.  **Web Palette (Astro):** A browser-based `Cmd+K` interface for registry discovery and metadata validation via WASM.
3.  **Embedded Palette (Revit):** An interoperability bridge that floats over the Revit canvas, allowing direct-to-canvas asset orchestration and "Ghost-Link" instantiation.

## Rationale
- **Expert Tooling:** Minimizes the "Job to be Done" cycle from minutes to seconds.
- **Platform Parity:** Whether in a terminal, on a website, or inside Revit, the verbs (e.g., `find`, `validate`, `ghost`) and the `pkd-core` logic remain identical.
- **AI-Agent Readiness:** Atomic, typed intent simplifies future AI-driven selection and automated infrastructure discovery.
- **Interoperability (ADR 0009):** The "Embedded Bridge" strategy in Revit allows the use of neutral, functional commands to displace proprietary legacy content.

## Impact
- **Web:** The Astro frontend will prioritize a central search/palette interface (`Cmd+K`).
- **Binary:** The `pkd-cli` will provide a scriptable interface for local AEC automation and RFC 8628 authentication.
- **Revit:** The plugin will invoke `pkd-cli` or `pkd-core` directly, enforcing Pharos standards *inside* the project environment.
- **Taxonomy:** All assets inserted via commands will follow the **`Bridged-`** naming standard.
