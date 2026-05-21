<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / ADR
 * File: docs/adr/0041-multi-agent-rigor-gate-enforcement.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Hardening Multi-Agent Orchestration against SDLC bypasses.
 * Traceability: ADR-0035, ADR-0037, ADR-0039
 * status: Approved
 * ======================================================================== -->

# ADR-0041: Multi-Agent Rigor & Gate Enforcement

## Context
During the expansion to Hub/Sibling parallel orchestration (ADR-0035), the project experienced "Process Drift." Specifically, the velocity of parallel streams led to:
1.  **Crucible Opacity**: Reasoning for implementation paths (ADR-0017) was not durable.
2.  **Batching**: Multiple unrelated Issues were grouped into single sub-agent sessions, violating the Atomic Mandate.
3.  **Gate Bypassing**: Mandatory peer reviews (Phase 4) were treated as optional under time pressure.

## Decision
We will implement the following "Rigor Guardrails" for all Multi-Agent sessions:

1.  **Durable Reasoning**: The \`SESSION_CONTEXT.md\` (ADR-0039) MUST contain a "Three-Option Crucible" section documenting the options considered and the winning strategy BEFORE the sub-agent begins execution.
2.  **One-Sibling-One-Issue**: Grouping multiple issues into a single sibling or sub-agent session is STRICTLY PROHIBITED. Each Issue ID requires a dedicated physical worktree.
3.  **Physical Audit Gate**: The project's CI script (\`pulse.sh\`) and governance linter will be updated to require the existence of an Audit Log (\`docs/governance/audits/PR-X.md\`) before allowing a merge to \`main\`.
4.  **Builder-to-Auditor Handover**: A sub-agent that acts as a "Builder" for a branch is physically restricted from acting as the "Auditor" for that same branch.

## Rationale
Ensures that the Pharos Standard (High-Rigor, VSA, Clean Architecture) is enforced mechanically rather than relying on agentic "good behavior." This protects the system from the compounding debt of unreviewed parallel changes.

## Impact
-   **Positive**: Restores "Reasoned Transparency" to the codebase; eliminates "Atomic Contamination" of PRs.
-   **Negative**: Increases turn-count overhead for orchestrating many individual siblings.
-   **Neutral**: Requires stricter supervision from the PMA/Orchestrator.
