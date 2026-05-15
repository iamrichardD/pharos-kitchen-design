/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: docs/adr/0034-issue-complexity-labeling-standard.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Formalize the ECT labeling standard for capacity governance.
 * Traceability: ADR-0032, ADR-0033
 * ======================================================================== */

# ADR-0034: Issue Complexity Labeling Standard

## Status
Proposed (2026-05-15)

## Context
As the project moves toward a "Dynamic Capacity Model," we need high-visibility observability into the complexity profile of our backlog and active sprints. Text-based ECT values in markdown files are insufficient for automated metrics and quick visual audits by the team.

## Decision
We adopt a standardized GitHub Label set for Estimated Complexity Tiers (ECT). These labels use a color-coded "Heatmap" gradient to signal the risk and effort profile of any given task.

### 1. The Color Standard
| Label | Color | Hex | Definition |
| :--- | :--- | :--- | :--- |
| **ECT: 1** | Light Blue | `C5DEF5` | Surgical Strike (< 30m) |
| **ECT: 2** | Green | `0E8A16` | Component Logic (~1h) |
| **ECT: 3** | Yellow | `FBCA04` | Cross-Cutting (~2-3h) |
| **ECT: 4** | Orange | `D93F0B` | System Integration (~4-6h) |
| **ECT: 5** | Red | `B60205` | Architectural Shift (> 1 day) |

### 2. Operational Rules
- **Mandatory Assignment**: No task may enter a "Sprint" or "Active" state without an assigned ECT label.
- **Decomposition Trigger**: Any issue labeled with `ECT: 4` or `ECT: 5` is a candidate for the Small Stones Mandate (ADR-0033).
- **Velocity Tracking**: Weekly velocity is calculated by summing the ECT labels of all issues closed within the Friday-to-Friday window.

## Consequences
- **Positive**: Instant visual audit of sprint risk, automated velocity calculations, and improved DORA observability.
- **Negative**: Minor overhead in managing labels.

## Traceability
- **Metrics**: `docs/governance/WEEKLY_VELOCITY_LOG.toon`
- **Workflow**: `docs/governance/FRIDAY_HANDOFF.md`
