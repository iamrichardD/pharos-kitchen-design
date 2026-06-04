<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0051-authoritative-map-synchronization.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify the automated roadmap synchronization protocol.
 * Traceability: Issue #207, Issue #208
 * Last Updated: 2026-06-02
 * Status: Approved
 * ======================================================================== -->
# ADR-0051: Authoritative Map Synchronization

## Context
Our public roadmap is currently a static file that doesn't reflect the high-velocity work happening in the monorepo. This creates a "Hallucination Gap"—where the site says we're still planning features that we've already merged into `main`. Keeping the roadmap in sync manually is high-toil work that we often forget to do.

## Decision
We're implementing the **Living Map Protocol**. The public roadmap will no longer be a manual page; it will be an automated reflection of our authoritative internal logs.

1.  **Strict Temporal Segregation**:
    - **`@TODO.md`**: Dedicated strictly to the **Present & Future** (backlog and active sprint). No completed history.
    - **`@PROGRESS.md`**: Dedicated strictly to the **Past & Present** (historical record and current sprint outcomes).
2.  **Standardized Header Schema**: All Sprint headers MUST follow the regex-ready format:
    `### Sprint [ID]: [Name] ([YYYY-MM-DD]) - [STATUS]`
3.  **Tagged Markdown Standard**: Every task entry MUST be enriched with metadata markers for machine readability:
    - `[TAG: ...]` (e.g., `[TAG: Core]`, `[TAG: Security]`)
    - `[DESC: ...]` (A human-centric summary of the user-facing value).
4.  **Archival Policy**: Completed sprints older than the current Phase MUST be archived to `docs/governance/sprints/` to maintain root log performance.
5.  **The Sync Engine**: I'm building a script (`scripts/sync-roadmap.ts`) that parses these logs and outputs a structured `roadmap.toon` file.
6.  **Pulse Integration**: This engine will run as a mandatory step in our CI `pulse` check. Every merge to `main` will trigger a roadmap refresh.

## Rationale
- **Zero Toil**: Developers just update the logs they're already using, and the website updates itself.
- **Authenticity**: Showing the community our real-time progress builds trust and eliminates confusion.
- **Consistency**: This leverages our existing TOON parser gains and aligns with our "Metadata-First" philosophy.

## Consequences
- **Log Rigor**: If we mess up the formatting in `@PROGRESS.md`, the sync engine will fail. This forces us to maintain high-quality internal documentation.
- **Lossless Refactor**: Our current organic logs need a one-time restructuring to adopt the new "Tagged Markdown" standard.
