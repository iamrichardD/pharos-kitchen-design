/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Backlog
 * File: @TODO.md
 * Purpose: Central tracking for Phase-specific tasks and issues.
 * ======================================================================== */

<!-- 
  AI_AGENT_PROTOCOL: @TODO.md
  1. SOURCE OF TRUTH: This document is the logical authority for the backlog.
  2. PRE-FLIGHT CHECK: Tasks must be defined here and approved by the user BEFORE implementation begins.
  3. TRACEABILITY: Ensure every active task has an associated #IssueID once the branch is created.
  4. PURGE TRACKING: Explicitly log deleted files/logic in the 'Purge/Stale' section to prevent "Ghost References" in future research.
  5. ATOMICITY: Focus on one Phase/Task at a time. Do not "scatter" progress across unrelated silos.
-->

# @TODO: Pharos Kitchen Design (Project Prism)

## ✅ Completed (Verified)

### Phase 1: Marketing & Foundation
- [x] Initial ADR scaffolding (0001-0013).
- [x] Marketing Site implemented (Astro, Tailwind, Technical Blueprint).
- [x] CI: OIDC-based deployment workflow established and verified.

### Phase 2: Metadata Core & Identity
- [x] Issue #5: Provision AWS Cognito & Cloudflare D1 (OpenTofu).
- [x] Issue #6: GitHub-to-AWS OIDC Federation (Security).
- [x] Issue #7: Integrate Auth Bridge with Live Cognito (Real JWTs).
- [x] Issue #9: Implement `pkd-core` Truth Engine (Rust/WASM).
- [x] Issue #10: RFC 8628 Auth: Implement local `auth login` flow with secure token storage (`keyring-rs`).
- [x] Deep Validation: Semantic type-checking for shared parameters.
- [x] CI Remediation: Resolved IAM Trust Policy case-sensitivity/Wildcard warnings.

---

## 📋 Active Backlog

### Phase 3: The CLI Bridge (Admin Control Plane)
- [x] **Scaffold pkd-cli:** Rust binary with `clap` and the 5 `pkd_role` variants (IKD, OEM, VDC, ADMIN, AUDITOR, BOT).
- [x] **Admin Control Plane:** Implement `pkd admin users` for Cognito orchestration and attribute management.
- [x] **Handshake Remediation:** Update `handshake.test.ts` to target local Worker environment in Podman.
- [x] **X-Pharos-Impersonate:** Implement administrative impersonation logic in the Auth Bridge.
- [x] **Library Extraction (ADR 0024):** Extracted `pharos-protocol` crate for shared RFC 2378 logic.
- [x] **Ergonomic Search:** Replaced flag-based search with RFC 2378 query syntax in `pkd core search`.
- [x] **Command Guards:** Implement local `Fail Fast` role-based access for CLI subcommands.
- [x] **Positional Fallback:** Implement `pkd <query>` as the default ergonomic entry point.
- [x] **Secret Audit:** Verify transition from plain environment variables to Cloudflare Secrets for AWS credentials.

### Sprint 3.5: Audit Remediation (Architectural & Security) - #11 - ✅ COMPLETED
- [x] **Remediate [GOV-001]:** Standardized File Prologue Sweep (Verified).
- [x] **Remediate [SEC-001/002]:** Implement `Containerfile.ts` and Zero-Host TS enforcement.
- [x] **Remediate [GOV-002]:** Documentation Pass for "Why" Mandate (Public APIs).
- [x] **Remediate [GOV-003]:** Refactor legacy tests to Atomic Semantic Naming standard.
- [x] **Process Hardening**: Implemented Research Hard Gate and Three-Option Rule in `GEMINI.md`.
- [x] **Documentation & Marketing**: Updated `ARCHITECTURE.md`, `roadmap.astro`, and created `CLI_REFERENCE.md`.

### Sprint 3.6: IKD-Centric Messaging Pivot - #13 - ✅ COMPLETED
- [x] Designer-centric language audit.
- [x] Jargon removal & functional utility mapping.

### Phase 4: Revit & Web Interop (Project Prism Bridge)
- [x] **Issue #20 (Log Sync)**: Synchronized Decision Log with ADR-0023/24/25.
- [x] **Issue #18 (SRI)**: Rectified Umami SRI and implemented Fail-Fast build check.
- [x] **Issue #17 (Scaffold)**: Revit Bridge (.NET 8) and Demo Site (Astro) initialized.
- [x] **Issue #19 (VSA)**: `pkd-core` refactored for category-based Vertical Slices.
- [x] **Issue #21 (Interop Bridge)**: Established memory-safe UTF-8 FFI boundary.
- [x] **Issue #22 (VSA Dispatcher)**: Logic routing for vertical slices.
- [x] **Issue #23 (Distribution Pipeline)**: Automated native binary distribution.
- [x] **Issue #24 (Integration Smoke Test)**: Cross-language handshake verification.
- [x] **Issue #25/26 (Build Fixes)**: Resolved SRI script syntax and tracking.
- [x] **Issue #27**: Remediate Revit Bridge governance gaps and implement Zero-Host container validation.
- [ ] **Issue #32**: Implement `pkd-core` JSON error serialization for FFI (Interop Bridge).
- [ ] **Issue #28**: Shared Design System Extraction (UI/UX Bridge).
- [ ] **Issue #29**: Scaffold Revit Ribbon UI & Command logic.
- [ ] **Issue #30**: Implement "Ghost Link" prototype (Metadata sync).
- [ ] **Issue #31**: Verify end-to-end "Revit -> Bridge -> Web" metadata flow.
- [ ] **Issue #33**: Integrated CI script for cross-language validation.

---

## 🗑️ Purge/Stale Logic
- [x] **ADR-0019**: Superseded by ADR-0021 (Cloudflare Edge Pivot).
- [x] **pkd-core legacy parser**: Refactored in favor of Vertical Slices (Issue #19).
