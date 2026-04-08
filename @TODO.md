/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Backlog
 * File: @TODO.md
 * Purpose: Central tracking for Phase-specific tasks and issues.
 * ======================================================================== */

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
- [x] Deep Validation: Semantic type-checking for shared parameters.
- [x] CI Remediation: Resolved IAM Trust Policy case-sensitivity/Wildcard warnings.

---

## 📋 Active Backlog

### Phase 3: The CLI Bridge (Admin Control Plane)
- [ ] **Scaffold pkd-cli:** Rust binary with `clap` and the 5 `pkd_role` variants (IKD, OEM, VDC, ADMIN, AUDITOR, BOT).
- [ ] **RFC 8628 Auth:** Implement local `auth login` flow with secure token storage (`keyring-rs`).
- [ ] **Admin Control Plane:** Implement `pkd admin users` for Cognito orchestration and attribute management.
- [ ] **Handshake Remediation:** Update `handshake.test.ts` to target local Worker environment in Podman.
- [ ] **X-Pharos-Impersonate:** Implement administrative impersonation logic in the Auth Bridge.
- [ ] **Command Guards:** Enforce role-based access for local CLI subcommands.

### Phase 4: Revit & Web Interop (The Three Pillars)
- [ ] **Revit Embedded Bridge:** Initial C# scaffold with floating `Cmd+K` palette.
- [ ] **Ghost-Link Spoofer:** Implement logic to generate `Bridged-` placeholders.
- [ ] **Web Registry:** Transition the demo site to a live registry view using D1 and `pkd-core` WASM.
- [ ] **Agentic Specification:** Implement the WebMCP interface for AI equipment queries.

---

## 🗑️ Purged / Stale
- [x] Removed `local-server.ts` (Deprecated in favor of D1/AuthRepository).
- [x] Removed `db.ts` DynamoDB logic (Consolidated to D1).
