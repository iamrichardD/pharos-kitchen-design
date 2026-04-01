/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0002-pharos-schema-initialization.md
 * Status: Active
 * ======================================================================== */

# ADR 0002: Pharos Schema Initialization & LOD Standards

## Context
Implementing the "Ghost-Link" Metadata Stripper and BIM normalization standards for AEC interoperability.

## Decision
Defined the initial **`pharos-schema.json`** with strict **LOD 100-300 definitions**, **OmniClass Table 23 mapping**, and the **"50KB Bloat Rule."**

## Rationale
To provide an actionable technical framework for the procedural generation of lean Revit families, directly addressing the "bloat" identified in incumbent systems (KCL, AutoQuotes).

## Impact
- All future content generation must pass validation against this schema.
- **Skill Improvement Proposal:** Automated Parametric Volume Verification (APVV).
- Establishes the "Metadata is the Source of Truth" mandate.
