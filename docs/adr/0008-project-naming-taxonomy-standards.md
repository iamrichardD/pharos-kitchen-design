/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0008-project-naming-taxonomy-standards.md
 * Status: Approved
 * ======================================================================== */

# ADR 0008: Project Naming & Taxonomy Standards

## Context
The project needs a consistent and professional naming convention that balances public brand clarity with internal developer velocity.

## Decision
Adopt a tiered naming strategy:
1.  **Public Brand**: **Pharos Kitchen Design** (Used in marketing, whitepapers, and external docs).
2.  **Digital Identity**: **`pharos-kitchen-design`** (Used in URLs, slugs, and repository naming for SEO/AI Agent clarity).
3.  **Strategic Alias**: **Project Prism** (Used to refer to the meta-architecture and competitive displacement strategy).
4.  **Internal Shorthand**: **PKD** or **pkd** (Used in internal documentation, package naming, and code prefixes).

## Rationale
Using the full name in marketing and URLs ensures maximum SEO and AI "entity recognition." Using **PKD** internally reduces visual noise and speeds up development while maintaining a high-rigor, professional identity similar to industry standards (e.g., KCL, AQ).

## Impact
- Monorepo packages will be named `pkd-core`, `pkd-bridge`, `pkd-ui`, etc.
- Internal documentation (TODOs, Progress, ADRs) will use **PKD** as the default acronym.
- All code files will include the full **Pharos Kitchen Design** project name in the Standardized File Prologue for grounding.
