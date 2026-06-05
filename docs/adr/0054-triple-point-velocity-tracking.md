<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Architecture / Governance
 * File: 0054-triple-point-velocity-tracking.md
 * Author: PMA (via Gemini CLI)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the multi-point velocity and volatility metric.
 * Traceability: ADR-0030, Sprint 5.01 Retro
 * Last Updated: 2026-06-05
 * ======================================================================== -->

# ADR-0054: Triple-Point Velocity & Volatility Analysis

## Status
Approved (2026-06-05)

## Context
Pharos utilizes Estimated Complexity Tiers (ECT) to track project velocity (ADR-0030). However, the simple "Target vs Actual" model failed to distinguish between **Automation Surges** (being faster at planned work) and **Reactive Toil** (handling unplanned interruptions).

In Sprint 5.01, a +12 variance masked the fact that we spent 3 points on reactive security fixes. Without sharding this data, we cannot accurately measure our "Environmental Volatility" or the true ROI of our internal tooling.

## Decision
We evolve our velocity tracking to a **Triple-Point Metric** for all sprint wrap-ups:
1. **Assigned ECT (A-ECT)**: The complexity points committed during the Monday Kickoff.
2. **Unplanned ECT (U-ECT)**: Complexity points added mid-sprint due to reactive fixes (Reactive) or acting on discovery (Proactive).
3. **Completed ECT (C-ECT)**: The final total of all tasks successfully merged and verified 🟢 PHAROS GREEN.

**Key Analytical Ratios**:
- **Environmental Volatility**: `U-ECT / C-ECT`. (The tax of the outside world).
- **Automation Dividend**: `(C-ECT - U-ECT) / A-ECT`. (The multiplier gained from process improvements).

## Rationale
- **High-Fidelity Feedback**: Provides a clear signal on whether we are over-committing or if our environment is becoming more hostile.
- **Strategic Calibration**: Allows the SPM to justify "Hardening Sprints" when volatility exceeds 20% of capacity.
- **Sustainable Pace**: Protects the team's "Awesome" by acknowledging the cognitive cost of interrupts.

## Impact
- **Transparency**: 🟢 Clear visibility into where engineering time is actually spent.
- **Planning**: 🟢 Data-driven capacity planning for future sprints.
- **Reporting**: Weekly reports now tell a nuanced story of momentum versus friction.
