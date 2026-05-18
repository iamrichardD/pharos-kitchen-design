/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: docs/adr/0037-multi-agent-handover-protocol.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Formalize the handover process for AI Agent peer review.
 * Traceability: Phase 4 Crucible Audit, ADR-0035
 * ======================================================================== */

# ADR-0037: Multi-Agent Handover & Crucible Protocol

## Status
Proposed (2026-05-18)

## Context
High-rigor engineering in Pharos requires that implementation (the "Builder") and review (the "Auditor") be performed by isolated AI sessions to prevent confirmation bias and ensure comprehensive security/gap analysis. With the adoption of the Hub/Sibling pattern (ADR-0035), we need a standardized way to package work and "summon" an Auditor.

## Decision
We codify the **Pharos Handover Protocol** to bridge the implementation and audit phases.

### 1. The Handover Package (Builder Side)
Before a "Builder" session concludes, it MUST:
- **Branch Integrity**: Commit all changes to a `feat/issue-X` branch and push to the Hub.
- **PR Draft**: Create a formal Pull Request (or a simulated one if local) using the Pharos PR Template.
- **DORA Capture**: Record the ECT vs ACT variance and Change Failure Rate (CFR).
- **The Invocation Prompt**: Generate a high-signal markdown block that can be pasted into a fresh AI session to initiate the audit.

### 2. The Invocation Prompt Template
```markdown
# Pharos Crucible Audit Request: Issue #[ID]
**Target Branch**: [branch-name]
**Fix Summary**: [1-sentence summary]
**Context**: This work has been completed in a Hub/Sibling worktree.

## Auditor Directive
1. Create a new sibling worktree for the audit: `git worktree add ../audit-issue-[ID] [branch-name]`.
2. Activate Skill: `pharos-crucible`.
3. Perform Audit using `HEURISTICS.md`:
   - [ ] Code Review (SOLID, VSA, Clean Code)
   - [ ] Security Audit (Memory safety, Sentinels, Attack vectors)
   - [ ] Gap Analysis (Edge cases, technical debt)
4. Provide inline comments in the PR/Branch.
5. Provide a "Brutally Honest" evaluation before promotion to main.
```

### 3. The Auditor Persona (Auditor Side)
- **Zero Memory**: The Auditor MUST be a fresh session with no history of the Builder's internal reasoning.
- **Standardized Heuristics**: The Auditor MUST strictly follow `.github/CRUCIBLE_HEURISTICS.md`.

## Rationale
This protocol ensures architectural integrity and security without relying on a single agent's internal state. It treats the Hub as the "Single Source of Truth" and the Sibling worktrees as "Disposable Engineering Pods."

## Impact
- **Quality**: significantly higher catch rate for security flaws and design smells.
- **Continuity**: Seamless "Human/AI" and "AI/AI" handovers.
- **Overhead**: Requires a context reset between phases, slightly increasing token usage but significantly reducing technical debt.

## Traceability
- **Skill**: `pharos-crucible`
- **Pattern**: ADR-0035 (Hub/Sibling)
