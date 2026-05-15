/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: docs/adr/0032-high-rigor-weekly-cadence.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Formally codify the 4+1 Pharos Engineering & Strategy cycle.
 * Traceability: ADR-0028, ADR-0031
 * ======================================================================== */

# ADR-0032: High-Rigor Weekly Cadence (The Pharos Routine)

## Status
Proposed (2026-05-15)

## Context
As the Pharos project scales, the need for balanced engineering focus and strategic synthesis has become critical. Unstructured engineering sprints lead to documentation drift and technical debt, while insufficient planning time degrades the project's long-term DORA metrics.

## Decision
We adopt a formal **4+1 Weekly Cadence** for all Pharos vertical slices.

### 1. Engineering Days (Monday – Thursday)
- **Focus**: 6 hours per day of dedicated engineering focus.
- **Activities**: Day planning, task research, implementation (TDD), and validation (Pulse).
- **Standards**: Strict adherence to VSA, Clean Architecture, and the Three-Option Crucible (ADR-0017).

### 2. Synthesis & Innovation Day (Friday)
- **Focus**: Strategic reconciliation, marketing, and capacity planning.
- **Phase 1: Planning**: Audit velocity metrics and stage the next week's sprint.
- **Phase 2: Release**: Publication of the "Friday Pulse" (Human/Agent Collaborative Log).
- **Phase 3: Hackathon**: Optional unconstrained prototyping window for high-innovation ideas.

## Consequences
- **Positive**: Improved project predictability, higher-quality documentation, and dedicated space for innovation.
- **Negative**: Redirection of Friday engineering capacity to governance overhead.
- **Mitigation**: Use of the "Friday State Handoff" (FSH) to ensure seamless transitions.

## Traceability
- **Governance**: `docs/governance/FRIDAY_HANDOFF.md`
- **Metrics**: `docs/governance/WEEKLY_VELOCITY_LOG.toon`
