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

1.  **Tagged Markdown Standard**: Our `@PROGRESS.md` and `@TODO.md` files will follow a machine-parsable format using `[TAG: ...]` and `[DESC: ...]` markers on issue lines.
2.  **The Sync Engine**: I'm building a script (`scripts/sync-roadmap.ts`) that parses these logs and outputs a structured `roadmap.toon` file.
3.  **Pulse Integration**: This engine will run as a mandatory step in our CI `pulse` check. Every merge to `main` will trigger a roadmap refresh.
4.  **Transparency Badge**: The public UI will display the "Last Synced" timestamp to prove to the community that the map is alive and authoritative.

## Rationale
- **Zero Toil**: Developers just update the logs they're already using, and the website updates itself.
- **Authenticity**: Showing the community our real-time progress builds trust and eliminates confusion.
- **Consistency**: This leverages our existing TOON parser gains and aligns with our "Metadata-First" philosophy.

## Consequences
- **Log Rigor**: If we mess up the formatting in `@PROGRESS.md`, the sync engine will fail. This forces us to maintain high-quality internal documentation.
- **Lossless Refactor**: Our current organic logs need a one-time restructuring to adopt the new "Tagged Markdown" standard.
