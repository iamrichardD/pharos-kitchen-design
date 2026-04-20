<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0001-project-initialization.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: [Purpose]
 * Traceability: [Traceability]
 * Status: Approved
 * ======================================================================== -->

# ADR 0001: Project Initialization & Taxonomy

## Context
Establishing the groundwork for the Pharos-Kitchen-Design repository and competitive strategy against legacy incumbents.

## Decision
Adopt the **"Project Prism"** taxonomy and a **JSON-first source of truth**. Remove all explicit industry naming from core documentation to prevent trademark conflicts and maintain a technical focus.

## Rationale
To eliminate legacy AEC bloat and enable multi-platform interoperability while maintaining clean, technical documentation. This establishes the "Metadata-First" philosophy early in the lifecycle.

## Impact
- All subsequent development must prioritize metadata-driven geometry.
- Competitive artifacts are isolated to the `.artifacts/` directory.
- Architectural decisions are governed by the Pharos Meta-Architect (PMA) persona.
