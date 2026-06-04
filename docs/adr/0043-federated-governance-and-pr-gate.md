<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: 0043-federated-governance-and-pr-gate.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * Status: Accepted
 * Date: 2026-05-25
 * License: FSL-1.1 (See LICENSE file for details)
 * Traceability: ADR-0048
 * Last Updated: 2026-06-02
 * ======================================================================== -->

# ADR-0043: Federated Governance & Mandatory PR-Centric Mentorship

## Context
With the introduction of the **Federated Implementation Model** (ADR-0031, ADR-0035), the project now utilizes multiple parallel AI sessions (PMA/Builder pairs) working in isolated sibling worktrees. This creates a "Memory Gap" where the rationale behind implementation choices and peer-review remediations can be lost if a session is canceled or once it is merged. We need a durable, high-signal record that survives individual session lifecycles.

## Decision
We will enforce a "Mandatory PR Gate" and a "PR-Centric Mentorship" model for all non-trivial tasks.

### 1. The Mandatory PR Gate
A Builder's task is considered "Incomplete" even if all tests pass. The task is only complete once a **High-Rigor Pull Request** is created. This PR serves as the "Long-Term Memory" of the feature.
- The PR body must include: **Strategic Intent**, **Internal Crucible Rationale**, **Verification Evidence**, and **Regression Surface**.
- The Phase 4 Crucible Audit is **PROHIBITED** from starting until the PR is created.
- All PR text MUST follow the **Human-Centric Communication Standard** (ADR-0048).

### 2. PR-Centric Mentorship (Hybrid Model)
To maintain a lean and readable codebase while preserving deep technical mentorship:
- **Immutable Builder's Record**: The PR Description (body) belongs strictly to the **Builder**. It is the "Commit Message" for the feature and remains immutable once the audit begins. 
- **The Audit Thread**: All Crucible Audit results, verdicts (`🟢 PHAROS GREEN`), and technical critiques MUST be recorded as **comments** within the PR thread.
- **In-PR Feedback:** All peer review comments, technical rationale, and instructive guidance MUST be recorded within the GitHub PR review history and inline code comments.
- **Human Voice:** Mentorship comments MUST use the natural, first-person voice mandated by **ADR-0048**. 
- **In-Code References:** The source code will remain lean. For high-impact or non-obvious logic, a single-line reference is required: `// Rationale: See PR #X (Feature Name)`.
- **No Meta-Labels**: Prohibited from using "The Why," "Teachable Moment," or other labels that signal "AI Slop."

### 3. Sprint-Isolated Velocity Reporting
Granular DORA and ECT metrics will be moved from a monolithic `WEEKLY_VELOCITY_LOG.toon` to sprint-specific archival files in `docs/governance/REPORTS/` (e.g., `SPRINT_5.1_VELOCITY.toon`). This ensures context efficiency and prevents historical data from cluttering the active development window.

## Consequences
- **Positive:** Improved survivability for agents/collaborators; preserved architectural rationale; cleaner, higher-signal codebase.
- **Negative:** Slightly increased lead time due to explicit PR creation and archival steps.
- **Neutral:** Shift of focus from "In-Code Comments" to "PR History" for deep research.

## Traceability
- **Supersedes:** Informal practices in ADR-0037.
- **Enforcement:** `GEMINI.md` (Section 5).
- **Execution:** Issue #122 (Phase 5 Kickoff).
- **Voice Standard**: ADR-0048.
