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
- [x] **Content Refactor:** Pivot `index.astro`, `features.astro`, and `bridge.astro` to designer-centric utility.
- [x] **Asset Validation:** Ensure all placeholder screenshots are correctly tagged for IKD utility.
- [x] **Zero-Host Build:** Verify the marketing site still builds correctly in `Containerfile.ts`.
- [x] **CI/CD Decoupling:** Separated `deploy-infra.yml` and `deploy-site.yml` for independent delivery.


### Sprint 3.7: Theme-Aware Infrastructure - #25 - ✅ COMPLETED
- [x] **Semantic Token Bridge:** Implement CSS-variable driven color tokens in `global.css`.
- [x] **Tailwind Abstraction:** Map Tailwind configuration to these semantic tokens.
- [x] **Adaptive UI:** Refactor components to use theme-responsive classes (Zero-JS).
- [x] **Vellum Aesthetic:** Implement the "Architectural Vellum" palette for light mode (ADR 0022).

### Sprint 3.8: Theme Hardening & Production Integrity - #26 - ✅ COMPLETED
- [x] **Global Recursive Refactor:** Eliminate hardcoded dark-theme classes in `features.astro`, `bridge.astro`, and `roadmap.astro`.
- [x] **RGB Token Standard:** Refactor `global.css` to use space-separated RGB values for reliable Tailwind opacity modifiers.
- [x] **Decoration Normalization:** Centralize custom blueprint decorations from `bridge.astro` and `roadmap.astro` into `global.css`.
- [x] **Security Hardening (SRI):** Implement Subresource Integrity (SRI) hashes for external fonts and scripts.
- [x] **Automated Theme Audit:** Add a "Fail Fast" build step to detect hardcoded legacy color classes in `src/`.
- [x] **WCAG Verification:** Verify contrast ratios for the "Architectural Vellum" palette meet AA standards.

### Sprint 3.9: Asset Pipeline Hardening - #27 - ✅ COMPLETED
- [x] **Asset Generation:** Utilize Playwright to capture high-fidelity forensic screenshots from the live `/command-v1/` demo (Light/Dark variants).
- [x] **Asset Audit:** Implement a "Fail Fast" build step to verify all referenced images exist in the public directory.
- [x] **Zero-Host Build:** Pass both theme and asset audits in the Podman environment.

### Phase 4: Revit & Web Interop (The Three Pillars)
- [ ] **Revit Embedded Bridge:** Initial C# scaffold with floating `Cmd+K` palette.
- [ ] **Ghost-Link Spoofer:** Implement logic to generate `Bridged-` placeholders.
- [ ] **Web Registry:** Transition the demo site to a live registry view using D1 and `pkd-core` WASM.
- [ ] **Agentic Specification:** Implement the WebMCP interface for AI equipment queries.

---

## 🗑️ Purged / Stale
- [x] Removed `local-server.ts` (Deprecated in favor of D1/AuthRepository).
- [x] Removed `db.ts` DynamoDB logic (Consolidated to D1).
