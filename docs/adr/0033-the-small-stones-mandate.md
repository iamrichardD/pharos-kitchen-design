/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: docs/adr/0033-the-small-stones-mandate.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Mandate the decomposition of high-complexity tasks.
 * Traceability: ADR-0017, DORA Metrics
 * ======================================================================== */

# ADR-0033: The Small Stones Mandate (Complexity Decomposition)

## Status
Proposed (2026-05-15)

## Context
Monolithic tasks (Estimated Complexity Tier 4 or 5) increase the risk of "Big Rock" stagnation, where project momentum stalls due to long feedback loops and complex integration hurdles. This degrades developer joy and negatively impacts DORA Lead Time.

## Decision
We mandate the decomposition of all high-complexity tasks into atomic, verifiable "Small Stones."

### 1. The Threshold
- Any task assigned an **ECT of 4 or 5** MUST undergo a decomposition review before implementation begins.

### 2. The Small Stone Standard
- The parent task must be sharded into sub-tasks of **ECT 1 or 2**.
- Each sub-task must have a **Binary Definition of Success** (Pharos Green).
- Sub-tasks should follow the **Parallel Change** pattern (Expand, Migrate, Contract) whenever possible to maintain a functional codebase at every step.

### 3. Verification
- A "Big Rock" is not considered "In Progress" until its sub-stones are staged in `@TODO.md`.
- Success is measured by the frequency of "Pharos Green" status updates (Forward Momentum).

## Consequences
- **Positive**: Increased project velocity (perceived and actual), reduced regression risk, and better granularity in DORA metric tracking.
- **Negative**: Increased planning overhead during the initial phase of a task.
- **Mitigation**: Decomposed tasks are staged during the Friday Synthesis phase.

## Traceability
- **Process**: `@TODO.md` (Sharding)
- **Patterns**: Kent Beck (XP), Martin Fowler (Refactoring)
