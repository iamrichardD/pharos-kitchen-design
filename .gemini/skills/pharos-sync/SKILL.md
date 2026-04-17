---
name: pharos-sync
description: Synchronize Pharos Kitchen Design (PKD) project state between @TODO.md, @PROGRESS.md, and GitHub Issues. Use this skill when starting new tasks, completing work, or performing end-of-session state reconciliation. Also use this skill as a GATEKEEPER when a prompt starts with "bug report", "feature request", or "feature update request" to enforce documentation before implementation.
---

# Pharos Synchronization Protocol

This skill enforces the "Single Source of Truth" for the Pharos Kitchen Design (PKD) project by reconciling local tracking files with the GitHub issue tracker.

## 🛑 STRICT MANDATE: THE GATEKEEPER
When a user starts a prompt with **"bug report"**, **"feature request"**, **"feature update request"**, or when the agent identifies a **tracking intent** (creating a log or issue), you MUST follow the **Document then Stop** workflow:
1. **Document**: 
    - **Check Existing**: Search GitHub Issues and local tracking files (`@TODO.md`, `@PROGRESS.md`) for a related open issue.
    - **Scope Expansion**: If a related issue exists, document the new findings or requirements as a detailed comment on the existing issue to expand its scope.
    - **New Task**: If no related issue exists, execute the `sync-init` workflow (Create GH Issue, update `@TODO.md` and `@PROGRESS.md`).
2. **Summarize**: Provide a concise summary of the documented task (or scope expansion) and the verification strategy.
3. **STOP**: Do NOT proceed to implementation. Inform the user that the task is documented and you are stopping to allow for a clean session transition.

## Core Workflows

### 1. Task Initialization (`sync-init`)
When starting a new task from the backlog:
- **Pre-check Naming Protocol**: You MUST read `@TODO.md` before calling `gh issue create` to ensure the **Task ID** (e.g., `1.4`) and title alignment follow existing patterns.
- **Search Mandate**: Search BOTH `@TODO.md` and `@PROGRESS.md` for the proposed Task ID and Issue ID to ensure they are not already in use.
- **ID Assignment**: If a task is new and not in the backlog, assign the next available incremental ID for that phase.
- **Label Validation**: Always run `gh label list` before creating an issue. If a required label is missing, you MUST create it using `gh label create [NAME] --color [HEX]`.
- **Mandate**: Use `gh issue create` with the prefix `Task X.Y: [Title]`, `Bug #Z: [Title]`, or `Debt #A: [Title]`.
- **Update**: Immediately add the resulting `(Issue #ID)` to the corresponding line in `@TODO.md`.
- **Assignment**: Ensure the issue is assigned to the current agent and tagged with the correct `phase-X` label.

### 2. Progress Documentation (`sync-update`)
During active development:
- **Commentary**: Periodically update the GitHub issue with progress comments to ensure "Human/AI Handover" continuity.
- **Traceability**: Ensure every commit message references the Task ID (e.g., `feat(core): add validator logic (Task 1.4)`).

### 3. Task Closure (`sync-close`)
When a task meets the "Definition of Done":
- **Verification**: MUST perform **Production Verification**. Use `web_fetch` to confirm changes are live and functional on `https://iamrichardd.com/pharos-kitchen-design/`.
- **Summary**: Extract the "Fix Summary" and "Verification Prompt" from the implemented changes.
- **GitHub**: Post a final comment on the GitHub issue containing:
  - **Fix Summary**: High-level description.
  - **Security Review**: Explicit confirmation that the implementation adheres to `SECURITY.md`.
  - **Production Verification**: Confirmation that the live site was inspected and is correct.
  - **AI-Ready Verification Prompt**: The exact Podman command for local verification.
- **Close**: Close the GitHub issue.
- **TODO**: Mark the checkbox `[x]` in `@TODO.md`.

### 4. Reconciliation Sweep (`sync-audit`)
Before concluding a session:
- **Compare**: List all open/closed issues on GitHub and compare them against `@TODO.md` and `@PROGRESS.md`.
- **Repair**:
  - If GH is closed but TODO is `[ ]`, mark TODO complete.
  - If TODO is `[x]` but GH is open, close the GH issue with a summary.
  - If prefixes are missing from GH titles, add them using `gh issue edit`.

## Standards & Formatting

- **GitHub Titles**: MUST start with `Task X.Y: `, `Bug #Z: `, or `Debt #A: `.
- **Issue Labels**: `enhancement`, `bug`, `documentation`, `phase-X`.
- **Closure Comment**:
  ```markdown
  **Fix Summary**
  [Clear, high-level description of what changed]

  **AI-Ready Verification Prompt**
  `podman run --rm ... [exact command]`
  ```
