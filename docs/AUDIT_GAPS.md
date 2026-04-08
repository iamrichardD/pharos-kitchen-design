/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Audit
 * File: docs/AUDIT_GAPS.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Formal tracking of architectural and security gaps identified 
 *          during the Phase 3 Architecture Audit (2026-04-08).
 * Traceability: GEMINI.md, ADR-0017, ADR-0016
 * ======================================================================== */

# 🕵️ Architectural & Security Gap Report (2026-04-08)

The following gaps represent deviations from the strict mandates defined in `GEMINI.md` and the project's ADRs. These MUST be remediated to ensure Agentic Continuity and Zero-Host integrity.

## 🔴 CRITICAL: Zero-Host & Security
- **[SEC-001] Missing Node/TS Shift-Left Audits**: No equivalent to `cargo-audit` for `packages/auth-bridge` or `apps/marketing`.
    - *Remediation*: Implement `Containerfile.ts` and integrate `npm audit --audit-level=high` into the container cycle.
- **[SEC-002] Non-Containerized TS Testing**: The `auth-bridge` and `marketing` environments lack enforced Podman-only execution paths.
    - *Remediation*: Wrap all `npm` and `wrangler` commands in a Podman environment with the `--security-opt seccomp=unconfined` flag.

## 🟡 MAJOR: Governance & Continuity
- **[GOV-001] Missing Standardized File Prologues**: Deep modules in `pkd-core` and `auth-bridge` are missing the FSL-1.1 headers.
    - *Remediation*: Run a workspace-wide sweep to apply the prologue to all `.rs` and `.ts` files.
- **[GOV-002] "Why" Mandate Violation**: Rationale/intent documentation (`///` doc comments) is sparse in `pkd-core` and `pkd-cli`.
    - *Remediation*: Perform a documentation pass on all public APIs to explain implementation constraints and alternatives.
- **[GOV-003] Atomic Test Naming**: Legacy tests in `pkd-core` and `auth-bridge` do not follow the `test_should_[behavior]_when_[state]` semantic standard.
    - *Remediation*: Refactor existing test suites for semantic parity.

## 🔵 MINOR: Workflow Integrity
- **[WRK-001] Three-Option Crucible-Slice Rule**: Recent Phase 2/3 core changes were executed as single-path surgical strikes.
    - *Remediation*: Re-commit to ADR-0017 for all future core schema or API changes.

---
**Status**: 🆕 Open (Pending Remediation in Phase 3.5)
**Auditor**: Pharos Meta-Architect (PMA)
