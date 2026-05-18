/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: docs/adr/0035-hub-sibling-worktree-pattern.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Formalize the Hub/Sibling worktree pattern for parallel agents.
 * Traceability: ADR-0017, Issue #146
 * ======================================================================== */

# ADR-0035: Hub/Sibling Worktree Pattern for Multi-Agent Orchestration

## Status
Proposed (2026-05-18)

## Context
As the project enters Phase 4 and Phase 5, the complexity of tasks (e.g., #111 Parallelized JIT WASM Engine) requires high-rigor parallel engineering. Standard git branch-switching is insufficient because it creates "artifact pollution" in the `node_modules`, `target/`, and `dist/` directories, and risks race conditions during concurrent Podman builds.

Furthermore, nested worktrees (placing worktrees inside the main project directory) cause "Search Pollution," where AI agents accidentally read code from alternative implementation options during `grep` or `glob` operations.

## Decision
We adopt the **Hub/Sibling Pattern** for git worktree management. This architecture decouples the repository metadata (the Hub) from the working directories (the Siblings).

### 1. The Hub (Bare Repository)
The primary repository metadata is stored in a parent directory, typically named `<project>-hub`. This is a bare repository (no checked-out files).

### 2. The Siblings (Isolated Worktrees)
Working directories are checked out as siblings to the Hub. Each sibling is a dedicated directory for a specific branch.

**Structure:**
```text
/home/rdelgado/Development/pharos-kitchen-design-hub/
├── .git (The Bare Hub)
├── main/ (The primary authoritative sibling)
├── feat-issue-111-rayon/ (Isolated engineering sibling)
└── feat-issue-111-actor/ (Isolated alternative engineering sibling)
```

### 3. Orchestration Protocol
- **Isolation**: Each AI agent (Builder) is assigned to exactly ONE sibling directory.
- **Search Safety**: Agents MUST NOT perform searches outside of their assigned sibling directory.
- **Podman Parity**: Each sibling directory is mounted independently into Podman containers. This ensures that layer caching is isolated and one build cannot poison another.
- **Dependency Sovereignty**: Each sibling maintains its own `node_modules`, `target/` (Rust), and `.wrangler/` (Cloudflare) directories.

### 4. Lifecycle Management
- **Creation**: The SPM (Senior Program Manager) or PMA (Meta-Architect) creates the sibling using `git worktree add ../<sibling-name> <branch>`.
- **Promotion**: Upon successful "Pharos Green" verification and Crucible Audit, the sibling's changes are merged into the `main` branch, and the sibling directory is removed using `git worktree remove`.

## Consequences
- **Positive**:
    - Complete isolation of build artifacts and dependencies between parallel agents.
    - Zero search pollution; agents only "see" the code they are assigned to.
    - Deterministic Podman mounts and faster iterative builds.
    - Survisability: The Hub/Sibling structure is physically explicit on the disk, making it easier for new sessions to identify active workstreams.
- **Negative**:
    - Increased disk usage (multiple copies of dependencies).
    - Requires restructuring the existing "Standard Clone" to the "Hub/Sibling" model.

## Traceability
- **Standard Protocol**: `GEMINI.md` (Multi-Agent Worktree Protocol)
- **Constraint**: ADR-0017 (Three-Option Crucible-Slice Rule)
- **Execution**: Issue #146
