/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: 0017-crucible-slice-three-option-workflow.md
 * Status: Approved
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the Three-Option Crucible-Slice workflow for AI agents.
 * Traceability: GEMINI.md, ADR 0005, git worktree --help
 * ======================================================================== */

# ADR 0017: Crucible-Slice & Three-Option Workflow

## Context
High-rigor engineering requires empirical validation over speculative implementation. To ensure that **Pharos Kitchen Design (Project Prism)** consistently delivers the leanest, most secure, and most maintainable code, we must eliminate "toil-heavy" single-path development.

## Decision
1. **The Three-Option Rule**: For every **Non-Trivial** coding task, the AI agent MUST develop exactly three (or fewer) implementation options.
   - **Non-Trivial Definition (The Triviality Gate)**: A task is non-trivial if it:
     - Modifies files in `packages/pkd-core/` or `schema/`.
     - Impacts the **Shift-Left Security** posture (e.g., changes to authentication, input validation, or external API consumption).
     - Modifies the public API or shared interface of a **Vertical Slice**.
     - Introduces a new dependency to `Cargo.toml` or `package.json`.
   - **Surgical Strike (Single-Path)**: Tasks not meeting the above criteria (e.g., CSS updates, documentation fixes, internal component refactoring within a single app) follow a standard single-path Plan-Act-Validate cycle.
   - **Implementation Philosophies**:
     - **Beck (Simplicity)**: The smallest possible change to achieve "green."
     - **Martin (Architecture)**: Strict adherence to SOLID and Clean Architecture.
     - **Fowler (Refactoring/Hardening)**: Robust patterns and DevSecOps-focused hardening.
2. **The Crucible-Slice Workflow**: Use `git worktree` to isolate these implementations:
   - Create a single issue branch: `feat/issue-[ID]-[slug]`.
   - Spawn three isolated worktrees in the project's temporary directory (`/tmp`) as detached HEADs.
   - Run identical `podman run --rm ...` test, audit, and lint suites against all three.
3. **Brutally Honest Evaluation**: The AI agent MUST provide a decision matrix evaluating all three options with "brutal honesty" before promoting the winner to the issue branch and pruning the experimental worktrees.

## Rationale
By treating code development as a localized, empirical laboratory, we shift the cost of exploration to the AI while ensuring the human designer receives only the highest-quality "Refactored Truth." This aligns with the "IKD Empowerment" mandate by reducing technical debt and "BIM Bloat" at the source.

## Impact
- **Traceability**: All work is directly connected to a GitHub Issue via a single branch.
- **Quality**: The final commit represents an empirically validated "winner" rather than an initial draft.
- **Security**: Three independent implementations are audited, increasing the likelihood of identifying edge-case vulnerabilities.
