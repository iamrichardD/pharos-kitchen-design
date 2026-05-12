<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0030-performance-engineering-velocity-tracking.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Define the DORA and Complexity-based velocity tracking strategy.
 * Traceability: Issue #109, Issue #110, ADR-0028
 * Status: Accepted
 * ======================================================================== -->
# ADR-0030: Performance Engineering & Velocity Tracking

*   **Status**: Accepted
*   **Date**: 2026-05-12
*   **Deciders**: Senior Pharos Program Manager (PRC), Pharos Meta-Architect (PMA)
*   **Traceability**: Issue #109, Issue #110, ADR-0028

## Context
As Pharos Kitchen Design (Project Prism) transitions from a foundational prototype to a multi-vertical-slice architecture, the need for empirical project management increases. Traditional Agile "Story Points" are often subjective and prone to "Metric Inflation" in AI-driven environments. To maintain the project's **High-Rigor** standards and ensure predictable delivery to stakeholders, we require a "Metadata-First" approach to engineering performance.

## Decision
We will adopt a dual-stream metrics framework to track and improve team velocity:

1.  **DORA Metrics Enforcement**: We will track the four key DORA metrics for every vertical slice:
    *   **Lead Time for Changes**: Time from Issue creation to successful merge.
    *   **Change Failure Rate**: Percentage of PRs that require remediation after a CI/CD failure.
    *   **Deployment Frequency**: Frequency of successful merges to `main`.
    *   **MTTR (Mean Time to Recover)**: Time taken to resolve a gated CI/CD failure.

2.  **Complexity-Adjusted Velocity**: We will utilize a 5-Tier Complexity Assessment (codified in `GEMINI.md`) to weight our throughput:
    *   **Tiers 1-5**: Used to normalize "Tasks Completed" into "High-Rigor Units" (HRUs).

3.  **Mandatory Retrospectives**: Every non-trivial issue (#109, #110, etc.) MUST conclude with a DORA audit and an assessment of the "Actual vs. Estimated" complexity.

4.  **Public Tracking**: DORA metrics and retrospective insights MUST be documented in `@PROGRESS.md` to maintain radical transparency.

## Rationale
- **Objectivity**: DORA metrics provide non-subjective data on pipeline health and team efficiency.
- **Fail-Fast Project Management**: By tracking the Change Failure Rate, we can identify "Hot Spots" in our SDLC (e.g., governance or dependency gaps) and remediate them via "Debt" issues.
- **Predictability**: Complexity-Adjusted Velocity allows the SPM to commit to sprint goals with higher confidence, reducing the "Hallucination Gap" in roadmap projections.

## Consequences
- **Administrative Overhead**: Requires 15-20 minutes of data collection and documentation at the end of every task.
- **Accountability**: High transparency on failure rates may be challenging but is necessary for the **Pharos Standard** of engineering excellence.
- **Continuous Improvement**: Provides the empirical basis for "Debt" and "Gov" issue generation, ensuring the platform hardens as it grows.
