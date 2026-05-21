<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / ADR
 * File: docs/adr/0039-agentic-resilience-asynchronous-recovery.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Architectural rationale for Agentic Resilience and asynchronous recovery.
 * Traceability: ADR-0028, ADR-0035
 * ======================================================================== -->

# ADR-0039: Agentic Resilience & Asynchronous Recovery

## Context
In a multi-agent orchestrated environment (ADR-0031, ADR-0035), sub-agents operate in isolated sibling worktrees to perform specialized tasks. However, agentic workflows are subject to external interruptions, such as network timeouts, `canceled request` errors from the LLM provider, or session terminations. When a sub-agent session fails, its internal reasoning, plan, and progress are lost, requiring the orchestrator (PMA) to either restart the task from scratch or manually reconstruct the state.

## Decision
We will implement a **Pharos Resilience Protocol** that externalizes agentic intent and session state into the durable file system.

1.  **Durable Session Context**: Every parallel sub-agent session MUST be initialized with a `SESSION_CONTEXT.md` file located in the root of its assigned Sibling Worktree.
2.  **Mandatory Resumption Handshake**: Before beginning any task, a sub-agent MUST read the `SESSION_CONTEXT.md` to establish its mental map and verify its progress against the logical task list.
3.  **Atomic WIP Commits**: Sub-agents MUST perform atomic git commits after every successful tool call that modifies the codebase, ensuring that the "durable state" (the git history) is never more than one step behind the "active state."
4.  **State Externalization**: Any non-trivial reasoning, such as the outcome of a **Three-Option Crucible** (ADR-0017), MUST be documented in the `SESSION_CONTEXT.md` rather than remaining solely within the LLM's transient context.

## Rationale
-   **Continuity**: Enables a replacement agent to resume work immediately following a failure without human intervention.
    -   **Observability**: Provides the orchestrator (PMA) with a clear view of a sub-agent's progress and intent.
    -   **Cost Efficiency**: Reduces the need to re-read or re-process large amounts of data by maintaining a summary of work-in-progress.

## Impact
-   **Positive**: Significant reduction in "recovery time" (MTTR) for failed agent sessions; improved traceability of multi-step implementations.
-   **Negative**: Minor overhead (1-2 tool calls) to manage the context file and perform more frequent commits.
-   **Neutral**: Requires standardizing the structure of the `SESSION_CONTEXT.md` to ensure it is easily parsable by subsequent agents.
