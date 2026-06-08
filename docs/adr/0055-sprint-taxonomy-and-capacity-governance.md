<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: docs/adr/0055-sprint-taxonomy-and-capacity-governance.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify the [Phase].[Sequence] sprint naming convention and capacity planning.
 * Traceability: ADR-0032, ADR-0051, Issue #218
 * Last Updated: 2026-06-08
 * ======================================================================== -->

# ADR-0055: Sprint Taxonomy and Capacity Governance

## Status
Proposed (2026-06-08)

## Context
As Pharos transitions into Phase 5 (IKD Enablement), the ambiguity between "Strategic Milestones" and "Tactical Weekly Sprints" has created friction in our authoritative logs. We need a machine-readable and human-centric way to track velocity, capacity (ECT), and temporal progress.

## Decision
We formally adopt the **Major.Minor Sprint Taxonomy** and **ECT-Based Capacity Planning**.

### 1. Sprint ID Taxonomy (`[Major].[Minor]`)
- **Major (The Phase)**: Represents the high-level project milestone (e.g., `5` for IKD Enablement). Increments only upon completion of major strategic objectives.
- **Minor (The Weekly Sequence)**: A zero-padded sequential integer (e.g., `01`, `02`) representing the week within the current Phase. 
- **Reset**: The Minor digit resets to `01` whenever the Major Phase digit increments.
- **Example**: `5.01` is Week 1 of Phase 5. `5.02` is Week 2.

### 2. Capacity Governance (ECT Tiers)
- **ECT (Estimated Complexity Tier)**: Every task in `@TODO.md` MUST have an ECT (1-5).
- **Weekly Capacity**: A standard 4-day engineering week targets a total ECT load of **12-15 points** per active builder.
    - Tier 1: 0.5 pts
    - Tier 2: 1.0 pts
    - Tier 3: 3.0 pts
    - Tier 4: 5.0 pts
    - Tier 5: 8.0+ pts (Requires breaking down)
- **Buffer**: Friday (the "+1") is excluded from ECT capacity to allow for synthesis, audits, and governance rituals.

### 3. Temporal Realignment
- Sprints are strictly 1 week (Monday – Friday).
- On Monday Morning, the SPM MUST verify the Sprint ID against the calendar and transition the logs.

## Consequences
- **Positive**: Machine-readable roadmap synchronization; clearer team expectations; improved DORA metric tracking for "Lead Time to Change."
- **Negative**: Increased overhead in initial task estimation.
- **Mitigation**: Use the "Brutally Honest" self-critique to refine ECT estimates over time.
