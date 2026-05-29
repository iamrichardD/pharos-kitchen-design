<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0047-immutable-content-metadata-standard.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify schema requirements for project updates and blog logs.
 * Traceability: Sprint 4.11 Retrospective, ADR-0032
 * Status: Approved
 * ======================================================================== -->
# ADR-0047: Immutable Content Metadata Standard

*   **Status**: Approved
*   **Date**: 2026-05-29
*   **Deciders**: Senior Pharos Information Architect (SPIA), Senior Program Manager (SPM)
*   **Traceability**: Sprint 4.11 Retrospective, ADR-0032

## Context
Pharos utilizes a collaborative engineering log (The "Pharos Pulse") to maintain project history and provide transparency to stakeholders. As we scale Phase 5, these logs serve as "Agentic Memory." Inconsistent metadata (e.g., varying date formats or missing creation timestamps) degrades the structural integrity of the Marketing IA and complicates automated sorting.

## Decision
ALL content updates (specifically in `apps/marketing/src/content/updates/`) MUST adhere to the following schema:

1.  **Immutable Creation Timestamp**: Every post MUST include a `createdAt` field in ISO 8601 format. Once assigned and merged, this value is IMMUTABLE to preserve historical truth.
2.  **Queued Release Lifecycle**: Posts MUST include a `releaseAt` field for scheduling. The frontend MUST filter posts based on this value compared to the current system time.
3.  **Localized Display**: The `releaseAt` date MUST be rendered in the viewer's localized date format, excluding time.
4.  **Authoritative Sorting**: Sorting logic MUST utilize the full `releaseAt` timestamp for reverse-chronological ordering by default.

## Rationale
- **Historical Integrity**: Prevents "Retconning" of project progress.
- **IA Stability**: Enables deterministic rendering and sorting in the Marketing UI.
- **Marketing Sync**: Allows the team to queue technical updates ahead of major industry events or announcements.

## Consequences
- **Schema Strictness**: Requires agents to be diligent when generating new `.toon` files.
- **UI Logic**: Requires custom Astro/TypeScript helpers to handle localized rendering and future-filtering.
