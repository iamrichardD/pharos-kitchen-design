/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Security Documentation / Audit Log
 * File: docs/SECURITY_LOG.md
 * Purpose: A "Black Box Recorder" for security audit findings, accepted risks,
 *          and remediation paths to ensure Agentic Continuity.
 * Traceability: ADR-0016, ADR-0018, Issue #10
 * ======================================================================== */

# Pharos Security Audit Log (Project Prism)

<!-- 
  SECURITY_LOG_PROTOCOL: docs/SECURITY_LOG.md
  1. REVERSE-CHRONOLOGICAL: Always add NEW entries at the TOP (below this header).
  2. HISTORICAL INTEGRITY: This is an additive log. NEVER truncate, delete, or overwrite previous audits.
  3. REMEDIATION TRACKING: When a risk is remediated, add a NEW entry reflecting the updated status.
  4. ZERO-HOST VALIDATION: Only log "Pass" or "Remediated" if verified in a Podman container.
  5. TRACEABILITY: Link entries to specific ADRs or Issues.
-->

This log provides a transparent history of security audits conducted across the Pharos ecosystem (Web, CLI, Revit, Core). It documents known issues, accepted risks, and specific remediation paths.

## 🛡️ Active Audit History

### [2026-04-08] - Phase 3 CLI Security Hardening & CI Optimization
- **Trigger**: `cargo audit` in `Containerfile.cli` (Pre-installed builder image).
- **Target**: `packages/pkd-cli`.
- **Actions Taken**:
    - Created `Containerfile.cli` to pre-install `pkg-config`, `libssl-dev`, and `cargo-audit` (ADR-0016).
    - Upgraded `reqwest` to v0.12 in `packages/pkd-cli/Cargo.toml`.
- **Findings**: 4 Unmaintained warnings remain due to transitive dependencies.
    - `derivative` (v2.2.0) & `instant` (v0.1.13) via `keyring` -> `zbus`.
    - `number_prefix` (v0.4.0) via `indicatif`.
    - `rustls-pemfile` (v1.0.4) via `self_update` (Inherits `reqwest` v0.11).
- **Risk Assessment**: **LOW**. No active CVEs. Warnings are maintenance-only.
- **Remediation Path**: 
    - [x] Upgrade `reqwest` in `pkd-cli` to v0.12.
    - [ ] Monitor `self_update` for v0.42+ (expected to support `reqwest` v0.12).
    - [ ] Evaluate `keyring` alternatives if `zbus` remains unmaintained.
- **Status**: 🟢 **ACCEPTED** (Residual Maintenance Issues)

### [2026-04-08] - Phase 3 CLI Initial Scaffold Audit (Baseline)
- **Trigger**: `cargo audit` in Podman (`rust:latest`).
- **Target**: `packages/pkd-cli`.
- **Findings**: 4 Unmaintained warnings detected in indirect dependencies.
- **Status**: 🟡 **PASS (Unmaintained)**


---

## 🏗️ Security Architecture Status

| Component | Audit Tool | Last Run | Status |
| :--- | :--- | :--- | :--- |
| **pkd-core** | `cargo audit` | 2026-04-07 | 🟢 Pass |
| **pkd-cli** | `cargo audit` | 2026-04-08 | 🟡 Pass (Unmaintained) |
| **marketing** | `npm audit` | 2026-04-03 | 🟢 Pass |

---
*This document is managed by the Pharos Meta-Architect (PMA). AI agents MUST update this log after every non-trivial security audit.*

### [2026-04-08] - Security Audit: Phase 3 RFC 8628 Implementation (CLI)
- **Trigger**: Manual code review and architecture audit.
- **Target**: `packages/pkd-cli/src/auth.rs`.
- **Actions Taken**:
    - Evaluated RFC 8628 (Device Authorization Grant) handshake.
    - Audited token storage via `keyring-rs`.
- **Findings**:
    - [PASS] **Token Storage**: Native keyring integration prevents plain-text exposure on disk.
    - [PASS] **Transport**: `rustls-tls` enforced for all Identity Bridge communications.
    - [INFO] **JWT Validation**: Insecure decoding (`insecure_disable_signature_validation`) used ONLY for `whoami` informational display; server-side validation remains the authority.
    - [RISK] **URL Spoofing**: `PHAROS_AUTH_URL` environment override allows arbitrary bridge targets (Phishing vector).
- **Remediation Path**:
    - [ ] Sprint 4: Enforce HTTPS-only schemes for `PHAROS_AUTH_URL` overrides.
    - [ ] Sprint 4: Implement TLS pinning or certificate pinning for the production bridge.
- **Status**: 🟡 **ACCEPTED (Informational/Low Risk)**
