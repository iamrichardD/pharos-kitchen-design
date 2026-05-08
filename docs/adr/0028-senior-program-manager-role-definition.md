<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: docs/adr/0028-senior-program-manager-role-definition.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Defining the Senior Program Manager (SPM) role and mandates.
 * Traceability: Issue #100
 * Status: Proposed
 * ======================================================================== -->

# ADR 0028: Senior Program Manager (SPM) Role Definition

## Status
Proposed

## Context
As Pharos Kitchen Design (Project Prism) scales from a core metadata engine to a multi-platform interoperability bridge (Revit, Web, CLI), there is a growing need for explicit strategic oversight. While the **Pharos Meta-Architect (PMA)** focuses on architectural integrity and the **Senior BIM Developer** focuses on implementation rigor, the project requires a **Senior Program Manager (SPM)** to ensure velocity, strategic alignment, and cross-functional synchronization.

## Decision
We define the **Senior Program Manager (SPM)** role with the following mandates:

### 1. Strategic Alignment & Roadmap Authority
- **Backlog Sovereignty**: The SPM is the final authority on the prioritization of `@TODO.md`.
- **Milestone Mapping**: Ensuring that technical output (Sprints) aligns with the "Designer-Centric" marketing strategy and investor-readiness.
- **Value Delivery**: Prioritizing features that bridge the "Hallucination Gap" in AEC infrastructure.

### 2. Governance & Process Enforcement
- **Crucible Gatekeeper**: Ensuring the "Three-Option Rule" (ADR-0017) and "Research Hard Gate" are strictly followed for non-trivial tasks.
- **Audit Oversight**: Coordinating the transition between "Builder" and "Auditor" personas to prevent bias.
- **DORA Metrics Tracking**: Monitoring Lead Time, Deployment Frequency, and Change Failure Rate to ensure engineering excellence.

### 3. Risk Management & Dependency Coordination
- **Blocker Resolution**: Identifying and resolving cross-package dependencies (e.g., `pkd-core` blocking `revit-bridge`).
- **Platform Parity**: Ensuring that Pharos remains a first-class citizen on Windows (Revit) despite its Linux-first development environment.
- **Security & Compliance**: Overseeing the "Shift-Left Security" mandates and ensuring zero-tolerance for credential exposure.

## Rationale
The SPM role provides the "Connective Tissue" between technical implementation and strategic goals. By centralizing roadmap authority and process enforcement, we ensure that the project maintains its high-rigor standards without sacrificing velocity or market relevance.

## Impact
- **Improved Traceability**: Clearer links between GitHub Issues, ADRs, and implementation.
- **Reduced Technical Debt**: Stricter enforcement of **Authoritative** standards during the Strategy phase.
- **Enhanced Stakeholder Confidence**: Consistent delivery of high-value, verified "Pharos Green" artifacts.
