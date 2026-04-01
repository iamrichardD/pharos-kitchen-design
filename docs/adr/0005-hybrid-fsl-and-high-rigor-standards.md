/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0005-hybrid-fsl-and-high-rigor-standards.md
 * Status: Approved
 * ======================================================================== */

# ADR 0005: Hybrid FSL & High-Rigor Engineering Standards

## Context
Aligning Pharos-Kitchen-Design with the architectural and licensing rigor of the parent `pharos` project to secure investor backing.

## Decision
Adopted the **Functional Source License (FSL-1.1)** and implemented **Vertical Slice Architecture (VSA)**, **Clean Architecture**, and **Metadata-First Truth** as core mandates.

## Rationale
FSL protects the project from being absorbed by legacy incumbents while remaining "Source-Available" for independent designer feedback. VSA and Clean Architecture reduce technical debt and ensure feature-first delivery.

## Impact
- All code must pass **Podman-based validation** (Zero-Host Execution).
- Strict TDD naming standards (`test_should...when...`).
- Standardized File Prologue in every source file.
- Revit plugin target expanded to **Windows, macOS, and Linux**.
- Implementation of **Shift-Left Security** and **Automated Audits**.
