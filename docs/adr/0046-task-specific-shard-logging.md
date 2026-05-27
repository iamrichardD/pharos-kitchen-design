/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: docs/adr/0046-task-specific-shard-logging.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify high-rigor shard logging and conflict prevention mandates.
 * Traceability: Sprint 4.10 Day 3 Retrospective, Issue #146
 * Status: Approved
 * ======================================================================== */

# ADR-0046: High-Rigor Shard Logging & Conflict Prevention

## Context
As parallel engineering density increases (6+ siblings), the shared `SHARD_PROGRESS.md` file has become a high-friction point. Agents frequently overwrite historical logs, causing data loss and requiring token-intensive forensic recovery. Additionally, stale branches frequently cause protocol rollbacks (e.g., Issue #137 reverting Issue #170) due to missed rebases before the audit phase.

## Decision
We implement three critical process hardening mandates to reduce merge friction and context noise.

### 1. Task-Specific Shard Logging
- **Mandate**: Every task MUST write its progress to a dedicated file: `.project/shards/[sprint-id]/issue-[number].toon`.
- **Isolation**: Agents are prohibited from editing or overwriting logs belonging to other issues.
- **Sovereignty**: The task log is the authoritative record for the Crucible Audit.

### 2. Sprint-Scoped Directory Structure
- **Organization**: Logs are grouped by sprint (e.g., `sprint-4.10/`) to isolate context.
- **Ritual**: Shards are aggregated and purged during the Friday End-of-Sprint "Compaction" ritual.

### 3. Mandatory Pre-Audit Rebase
- **Mandate**: Before signaling \"Ready for Audit,\" a Builder MUST:
    1.  `git fetch origin main`
    2.  `git rebase origin/main`
    3.  Re-verify green status in Podman (`scripts/pulse.sh`).
- **Sentinel**: The Auditor MUST verify the branch is up-to-date with `main` as their first action.

## Rationale
- **Reliability**: Eliminates the \"Hallucination Gap\" between a local green state and a divergent remote state.
- **Efficiency**: Significantly reduces token usage by preventing complex manual merge reconciliations.
- **Hygiene**: Prevents \"Flat Folder Explosion\" and simplifies sprint cleanup.

## Consequences
- **Positive**: Zero-conflict progress logging; deterministic FFI protocol preservation.
- **Negative**: Increased local git operations for Builders.
- **Mitigation**: Standardize rebase commands in `GEMINI.md`.

## Traceability
- **Governance**: [ADR-0043: Federated Governance](docs/adr/0043-federated-governance-and-pr-gate.md)
- **Worktree**: [ADR-0035: Hub/Sibling Pattern](docs/adr/0035-hub-sibling-worktree-pattern.md)
