<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Backlog
 * File: @TODO.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central tracking for Phase-specific tasks and issues (Present & Future).
 * Traceability: Issue #207
 * Last Updated: 2026-06-04
 * ======================================================================== -->

<!-- 
 * AI_AGENT_PROTOCOL: @TODO.md
 * 1. TEMPORAL INTEGRITY: This file is for PRESENT and FUTURE backlog only.
 * 2. NO HISTORY: Do not store completed [x] tasks here. Move them to @PROGRESS.md.
 * 3. SCHEMA: Use strict [TAG: ...] and [DESC: ...] markers for machine readability.
 * 4. ATOMICITY: Focus on one Phase/Task at a time.
 -->

# @TODO: Pharos Kitchen Design (Project Prism)

## 🎯 Current Backlog: Phase 5 - IKD Enablement (Ghost Links & Scale)

### Sprint 5.01: Core Parser & Remediation (2026-06-01) - 🚀 ACTIVE
- [ ] **Issue #207**: [TAG: Governance] Lossless Authoritative Log Restructure. [DESC: Hardening @PROGRESS and @TODO into machine-readable DTOs for the Sync Engine.]
- [ ] **Issue #208**: [TAG: Governance] Automated Roadmap Synchronization. [DESC: Implementing the Sync Engine to automate roadmap updates from sharded logs.] (Blocked by #207)
- [ ] **Issue #204**: [TAG: Security] Multi-Org Pulse Filtering. [DESC: Implementing delegate enforcement for organizational equipment shards.]
- [ ] **Issue #205**: [TAG: Security] Hardening & Integration - Edge-Sovereign Passkey. [DESC: Verifying CLI ergonomics (biometrics) and implementing 'Magic Link' fallback recovery.] (Blocked by #204)

### 📋 Future Backlog

#### Phase 5: IKD Enablement (Ghost Links & Scale)
- [ ] **Issue #185**: [TAG: Perf] Zero-Allocation JSON Parsing. [DESC: Implementing source-generated JSON parsers to eliminate allocation overhead in WASM.]
- [ ] **Issue #148**: [TAG: Debt] Metadata Builder Pattern (Native). [DESC: Implementing the builder pattern for native C# objects in the Revit Bridge.]

#### Phase 4: Revit & Web Interop
- [ ] **Issue #107**: [TAG: Perf] Dependency Pruning. [DESC: Audit and prune `pkd-core` dependencies for lean WASM binaries.]
- [ ] **Issue #30**: [TAG: Prototype] Ghost Link Prototype. [DESC: Initial implementation of the Ghost Link mechanism for remote metadata hydration.]
- [ ] **Issue #28**: [TAG: UI] Shared Design System Extraction. [DESC: Extracting core components into a shared design system package for cross-app reuse.]
- [ ] **Issue #42**: [TAG: Security] SRI & SEO Audit. [DESC: Remediating SRI hashes and optimizing SEO for the Marketing site.]

#### Phase 3: CLI Bridge & Distribution
- [ ] **Issue #84**: [TAG: Infra] Dual-Stream Release Pipeline. [DESC: Configuring separate channels for stable and nightly releases.]
- [ ] **Issue #85**: [TAG: Infra] Official Homebrew Tap. [DESC: Initializing the official Pharos Homebrew tap for macOS/Linux distribution.]
- [ ] **Issue #87**: [TAG: Security] Domain-to-Org Mapping. [DESC: Implementing secure domain validation for organizational onboarding.]
- [ ] **Issue #89**: [TAG: Maintenance] Manufacturer Sidecar. [DESC: Developing a background service for manufacturer metadata updates.]

---

## 🗑️ Purge/Stale Logic
- [x] **ADR-0019**: [TAG: Purged] Superseded by ADR-0021 (Cloudflare Edge Pivot). [DESC: Legacy AWS bridge design removed.]
- [x] **pkd-core legacy parser**: [TAG: Purged] Refactored in favor of Vertical Slices (Issue #19). [DESC: Monolithic parser removed.]
- [x] **Cognito Identity Provider**: [TAG: Purged] Removed in favor of Cloudflare D1/Passkey model (Issue #206). [DESC: Legacy auth provider removed.]
