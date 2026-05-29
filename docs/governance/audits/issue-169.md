# Audit Log: Issue #169 (Supply Chain Watchdog)

/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Audit
 * File: docs/governance/audits/issue-169.md
 * Author: Pharos Auditor (AI)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of Supply Chain Watchdog and Image Pinning.
 * Traceability: Issue #169, ADR-0014
 * Status: 🟢 **PHAROS GREEN**
 * ======================================================================== */

## ⚔️ The Pharos Crucible (Audit Log)

### 1. Scope of Review
- **Branch**: `feat/issue-169-supply-chain-watchdog`
- **Objective**: Verify the implementation of the high-rigor Supply Chain Watchdog, image pinning via SHA-256, and integration into the Pulse pipeline.
- **ECT Verification**: Verified as **Tier 3 (Cross-Cutting Logic)**.

### 2. Verification Checklist
- [x] **CLI Audit Command**: `pkd registry audit` implemented in `packages/pkd-cli/src/registry.rs`. Verifies Containerfiles, package.json, and Cargo.toml.
- [x] **SHA-256 Pinning**: All `Containerfile`s (infra, pulse, truth-engine, ts, etc.) updated to use `@sha256` for base images.
- [x] **Dependency Hardening**: 
    - `prebuild-install` prohibited and removed.
    - Cargo critical FFI (e.g., `wasmtime`) requires exact pinning (`=`).
    - NPM/Cargo loose pinning (`*`, `latest`) prohibited.
- [x] **Atomic Pulse Gate**: `scripts/pulse.sh` updated to execute `scripts/supply-chain-watchdog.sh` as a mandatory security gate in the `CORE` slice.
- [x] **CI Watchdog**: `scripts/ci-watchdog.sh` updated with increased thresholds and improved process signature detection.
- [x] **Fail-Fast Parity**: `scripts/install.ps1` hardened with a Main-execution guard to prevent side effects during validation.

### 3. Brutally Honest Assessment
The implementation of the Supply Chain Watchdog represents a significant leap in the project's security posture. By moving from manual "best effort" pinning to an automated, CLI-driven audit that runs in every Pulse cycle, we have effectively eliminated a major class of supply-chain risks.

**Key Strengths**:
- **Zero-Host Adherence**: The audit logic is encapsulated in the CLI and executed via `podman-wrapper`, ensuring parity across development and CI environments.
- **FFI Rigor**: Enforcing exact pinning (`=`) for critical FFI dependencies like `wasmtime` prevents subtle binary compatibility issues that often plague cross-language projects.
- **Layer Optimization**: The `Containerfile` optimizations (squashing layers and improved caching) have reduced the CI footprint while increasing rigor.

**Minor Observation**: The `audit_npm_dependencies` logic currently allows `^` for non-critical dependencies. While consistent with common practice, a "Small Stones" approach might eventually require exact pinning for all production dependencies to achieve total reproducibility.

### 4. Final Verdict
The Supply Chain Watchdog is robust, well-integrated, and satisfies the high-rigor mandates of the Pharos Standard.

**Status: 🟢 PHAROS GREEN**
