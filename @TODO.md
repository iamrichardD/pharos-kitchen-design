<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Backlog
 * File: @TODO.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central tracking for Phase-specific tasks and issues (Present & Future).
 * Traceability: Issue #207
 * Last Updated: 2026-06-08
 * ======================================================================== -->

<!-- 
 * AI_AGENT_PROTOCOL: @TODO.md (ADR-0051)
 * 1. TEMPORAL INTEGRITY: This file is for PRESENT and FUTURE backlog only.
 * 2. NO HISTORY: Do not store completed [x] tasks here. Move them to @PROGRESS.md.
 * 3. SCHEMA: Use strict [TAG: ...] and [DESC: ...] markers for machine readability.
 * 4. ATOMICITY: Focus on one Phase/Task at a time.
 -->

# @TODO: Pharos Kitchen Design (Project Prism)

## 🚀 Active Sprint

### Sprint 5.02: The Speed & Security Foundation (2026-06-08) - 🚀 ACTIVE
- [ ] **Issue #223**: [TAG: Security] Implement Domain Allowlist in bless-sri.sh. [DESC: Adding origin verification to the blessing script to prevent accidental malicious blessing.]
- [ ] **Issue #222**: [TAG: Debt] Refine 'sed' targeting in bless-sri.sh. [DESC: Tightening regex targeting to prevent cross-talk during SRI updates.]
- [ ] **Issue #204**: [TAG: Security] Multi-Org Pulse Filtering. [DESC: Implementing delegate enforcement for organizational equipment shards.]
- [ ] **Issue #205**: [TAG: Security] Hardening & Integration - Edge-Sovereign Passkey. [DESC: Verifying CLI ergonomics (biometrics) and implementing 'Magic Link' fallback recovery.] (Blocked by #204)

---

## 📅 Future Sprints

### Sprint 5.03: The Ghost & The Bridge (2026-06-22) - 🔮 PLANNED
- [ ] **Issue #185**: [TAG: Perf] Zero-Allocation JSON Parsing. [DESC: Implementing source-generated JSON parsers to eliminate allocation overhead in WASM.]
- [ ] **Issue #107**: [TAG: Perf] Dependency Pruning. [DESC: Audit and prune `pkd-core` dependencies for lean WASM binaries.]
- [ ] **Issue #42**: [TAG: Security] SRI & SEO Audit. [DESC: Remediating SRI hashes and optimizing SEO for the Marketing site.]
- [ ] **Issue #87**: [TAG: Security] Domain-to-Org Mapping. [DESC: Implementing secure domain validation for organizational onboarding.]

### Sprint 5.04: The Scaling Infrastructure (2026-07-06) - 🔮 PLANNED
- [ ] **Issue #84**: [TAG: Infra] Dual-Stream Release Pipeline. [DESC: Configuring separate channels for stable and nightly releases.]
- [ ] **Issue #85**: [TAG: Infra] Official Homebrew Tap. [DESC: Initializing the official Pharos Homebrew tap for macOS/Linux distribution.]
