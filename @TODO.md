<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Backlog
 * File: @TODO.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central tracking for Phase-specific tasks and issues.
 * Traceability: [Traceability]
 * ======================================================================== -->

<!-- 
 * AI_AGENT_PROTOCOL: @TODO.md
 * 1. SOURCE OF TRUTH: This document is the logical authority for the backlog.
 * 2. PRE-FLIGHT CHECK: Tasks must be defined here and approved by the user BEFORE implementation begins.
 * 3. TRACEABILITY: Ensure every active task has an associated #IssueID once the branch is created.
 * 4. PURGE TRACKING: Explicitly log deleted files/logic in the 'Purge/Stale' section to prevent "Ghost References" in future research.
 * 5. ATOMICITY: Focus on one Phase/Task at a time. Do not "scatter" progress across unrelated silos.
 -->

# @TODO: Pharos Kitchen Design (Project Prism)

## ✅ Completed (Verified)

### Phase 1: Marketing & Foundation
- [x] Initial ADR scaffolding (0001-0013).
- [x] Marketing Site implemented (Astro, Tailwind, Technical Blueprint).
- [x] CI: OIDC-based deployment workflow established and verified.
- [x] **Bug #96**: CI/CD: pulse.sh fails in GHA due to missing diagnostic images (pkd-ts) (Task 1.7).
- [x] **Bug #98**: CI/CD: @pkd/core module resolution failure in ts-auditor stage.

### Phase 2: Metadata Core & Identity
- [x] Issue #5: Provision AWS Cognito & Cloudflare D1 (OpenTofu).
- [x] Issue #6: GitHub-to-AWS OIDC Federation (Security).
- [x] Issue #7: Integrate Auth Bridge with Live Cognito (Real JWTs).
- [x] Issue #9: Implement `pkd-core` Truth Engine (Rust/WASM).
- [x] Issue #10: RFC 8628 Auth: Implement local `auth login` flow with secure token storage (`keyring-rs`).
- [x] Deep Validation: Semantic type-checking for shared parameters.
- [x] CI Remediation: Resolved IAM Trust Policy case-sensitivity/Wildcard warnings.
- [x] **Issue #46**: Implement Pharos Truth Engine Crawler Logic (Frymaster) (Task 4.8).
- [x] **Issue #47**: Harden Manufacturer URI Infrastructure (Componentization) (Task 4.9).
- [x] **Issue #48**: Implement ForensicNormalizer & Pattern Mapping (Task 4.10). [AUDITED PR #67]
- [x] **Issue #50**: Truth Engine: Authoritative SQL Schema Extraction (Task 4.11).
- [x] **Issue #68**: Remediate Pulse WASM Artifact Environmental Gap (Task 4.18).
    - [x] **Issue #109**: Implement SHA-256 Manifest Generation for WASM Artifacts. [Tue]
    - [x] **Issue #110**: Enforce WASM Manifest Verification in Containerfile.pulse. [Tue]

---

## 📋 Active Backlog

### Sprint 4.9: The IKD Empowerment Sprint (2026-05-11) - 🚀 ACTIVE
- [x] **Issue #31**: Unified Interop Schema & FFI Boundary (Task 4.2). [Mon]
- [x] **Issue #105**: CI/CD Optimization & Supply Chain Hardening (Task 4.24). [Mon]
- [x] **Issue #68**: WASM Engine Performance & Artifact Promotion (Task 4.18). [Tue]
- [x] **Issue #109**: SHA-256 Manifest Generation for WASM (Task 4.19). [Tue]
- [x] **Issue #110**: Enforce WASM Manifest Verification (Task 4.20). [Tue]
- [x] **Bug #127**: CI/CD: Fix Podman layer failure in ts-auditor stage.
- [x] **Issue #52**: pharos-protocol 'OR' grouping & Temporal Warden (Task 4.15). [Wed]
- [x] **Issue #120**: Ghost Link Phase 2 - Dynamic Registry & Marketing Demo (Task 4.3). [Thu]

### Sprint 4.10: Performance & Scale
- [ ] **Issue #107**: Dependency Pruning for Lean WASM Binaries.
- [ ] **Issue #108**: Parallel Sharding for CI/CD Acceleration.
- [ ] **Issue #111**: Implement Parallelized JIT WASM Engine.
- [ ] **Issue #113**: ADR Template Automation with Mandatory Prologue.
- [ ] **Issue #114**: SDLC Update: Mandatory Regression Surface Mapping.
- [ ] **Issue #115**: Implement Local Governance Linter (pkd gov lint).
- [ ] **Issue #117**: Refactor Containerfile.pulse for Dedicated Verification Stage.
- [ ] **Issue #118**: Implement High-Rigor Manifest Failure Tests in Truth Engine.

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
- [x] **Issue #71**: Marketing Sync Phase 4 (Options A & B) (Task 4.19).
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
- [x] **Issue #32**: Implement `pkd-core` JSON error serialization for FFI (Interop Bridge).
- [x] **Issue #29**: Scaffold Revit Ribbon UI & Command logic.
- [x] **Issue #33**: Integrated CI script for automated cross-language validation.
- [x] **Issue #43**: Implement Pharos Synchronization Protocol (Task 4.1).
- [x] **Issue #31**: Verify End-to-End Revit -> Bridge -> Web Flow (Task 4.2).
- [x] **Issue #120**: Implement Ghost Link Phase 2 (Task 4.3).
- [ ] **Issue #28**: Shared Design System Extraction (Task 4.4).
- [ ] **Issue #42**: Audit Remediation: SRI, SEO, and WASM Bridge (Task 4.5).
- [x] **Issue #41**: Marketing Site CI/CD Build Failure (Bug #41).
- [x] **Issue #44**: Implement Pharos Crucible Process (Task 4.6).
- [x] **Issue #45**: Implement Pharos Crucible Enforcement Layer (Task 4.7).
- [x] **Issue #74**: Remediate CI Test Paths (Deterministic Pathing) (Task 4.20). [HARDENED REGEX WARDEN]

### Sprint 4.3: Registry Distribution & Pulse Protocol (#51-54, #65) - 🔄 In Progress
- [x] **Issue #53**: Implement `pkd core bake` engine for sharded JSON and binary indexes (Task 4.12).
- [x] **Issue #54**: Implement "Pulse" startup event with SHA-256 verification and XDG cache (Task 4.13).
- [x] **Issue #51**: Implement `--env [local|dev|stage|prod]` and environment isolation logic in `pkd-cli` (Task 4.14).
- [x] **Issue #60**: [SPIKE] Option C: WASM-Based Manufacturer Dialects (Task 4.16).
- [x] **Issue #62**: True Manufacturing Onboarding (Forensic KCL Spike) (Task 4.17).
- [x] **Issue #65**: CI/CD: WASM Build Hardening & Zero-Host Remediation. (Verified Pharos Green)
- [x] **Issue #99**: Consolidate Search, Wildcard, and Structural Clause Documentation (Task 4.23).
- [x] **Issue #52**: [DEFERRED] Upgrade `pharos-protocol` to support logical `OR` grouping (Task 4.15). (Requires #99)

### Sprint 4.4: CLI Distribution & Installation Documentation (#76-78, #82-83) - 📋 Backlog
- [x] **Issue #76**: Implement `/install` route and platform-specific landing page (Task 3.10).
- [x] **Issue #77**: Develop universal `install.sh` for Linux (Priority 1) and macOS (Task 3.11).
- [x] **Issue #78**: Update CLI Reference with Platform Prerequisites (Task 3.12). [feat/issue-78-cli-prerequisites]
- [x] **Bug #81**: Remediate Product Naming and URL Inconsistency in Install Documentation.
- [x] **Issue #82**: Automate Install Script Distribution (Task 3.13).
- [x] **Issue #83**: Harden Install Script $PATH Audit (Task 3.14).
- [x] **Issue #90**: Implement `check_writable` Logic for local installs (Task 3.17).
- [x] **Issue #91**: Add Versioning Support (`-v`) to `install.sh` (Task 3.18).
- [x] **Issue #92**: Implement 'Authoritative Release' Update Check (Idempotency) (Task 3.19).
- [x] **Issue #93**: Implement `--uninstall` Path (Task 3.20).
- [x] **Issue #94**: Scaffold `install.ps1` for Windows Parity (Task 3.21).
- [x] **Debt #102**: Installation Suite Hardening & Crucible Audit.
- [x] **Task**: Taxonomy Transition - Transition legacy 'Pharos Gold' to 'Authoritative' across all artifacts.

### Sprint 4.5: Infrastructure & Identity Governance (#84-87) - 📋 Backlog
- [x] **Issue #100**: Formalize SPM Role and Harden SDLC Governance (Verified Pharos Green).
- [ ] **Issue #84**: Configure Dual-Stream Release Pipeline (Task 3.15).
- [ ] **Issue #85**: Initialize Homebrew Tap (Official) (Task 3.16).
- [ ] **Issue #86**: ADR-0027: Organization-Based Authority Scopes.
- [ ] **Issue #87**: Implement Domain-to-Org Mapping (Task 4.21).

### Sprint 4.6: The Pulse Evolution (#88-89) - 📋 Backlog
- [ ] **Issue #88**: Implement `pkd core pulse` Command (Logic Center for JIT).
- [ ] **Issue #89**: Develop Manufacturer Maintenance Sidecar (Task 4.22).

---

## 🗑️ Purge/Stale Logic
- [x] **ADR-0019**: Superseded by ADR-0021 (Cloudflare Edge Pivot).
- [x] **pkd-core legacy parser**: Refactored in favor of Vertical Slices (Issue #19).
