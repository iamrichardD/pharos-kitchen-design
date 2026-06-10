<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Backlog
 * File: @TODO.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central tracking for Phase-specific tasks and issues (Present & Future).
 * Traceability: Issue #207
 * Last Updated: 2026-06-10
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
- [ ] **Issue #234**: [TAG: Protocol] Remediate Roadmap Status Mapping Mismatch. [DESC: Update sync-roadmap.ts to correctly categorize future sprints as 'Blueprint Approved' per ADR-0051.] [ECT: 2]
- [ ] **Issue #235**: [TAG: Infra] Resolve Demo URL 404 Build Omission. [DESC: Refactor CI/CD to build and nest the Demo application within the marketing dist folder.] [ECT: 2]
- [ ] **Issue #237**: [TAG: Debt] Remediate Rust Toolchain and Metadata Warnings. [DESC: Fix deprecated edition placement, unused code in pkd-cli, and missing repository metadata.] [ECT: 2]
- [ ] **Issue #238**: [TAG: Security] Remediate NPM Dependency Vulnerabilities. [DESC: Perform audit fix and resolve critical RCE vulnerabilities in Happy DOM and others.] [ECT: 3]

---

## 📅 Future Sprints

### Sprint 5.03: The Ghost & The Bridge (2026-06-22) - 🔮 PLANNED
- [ ] **Issue #239**: [TAG: UX] Refactor Marketing Site IA for Command-First Identity. [DESC: Implement high-fidelity Terminal Hero and capability-based documentation flow.] [ECT: 5]
- [ ] **Issue #185**: [TAG: Perf] Zero-Allocation JSON Parsing. [DESC: Implementing source-generated JSON parsers to eliminate allocation overhead in WASM.]
- [ ] **Issue #107**: [TAG: Perf] Dependency Pruning. [DESC: Audit and prune `pkd-core` dependencies for lean WASM binaries.]
- [ ] **Issue #42**: [TAG: Security] SRI & SEO Audit. [DESC: Remediating SRI hashes and optimizing SEO for the Marketing site.]
- [ ] **Issue #87**: [TAG: Security] Domain-to-Org Mapping. [DESC: Implementing secure domain validation for organizational onboarding.]

### Sprint 5.04: The Scaling Infrastructure (2026-07-06) - 🔮 PLANNED
- [ ] **Issue #84**: [TAG: Infra] Dual-Stream Release Pipeline. [DESC: Configuring separate channels for stable and nightly releases.]
- [ ] **Issue #85**: [TAG: Infra] Official Homebrew Tap. [DESC: Initializing the official Pharos Homebrew tap for macOS/Linux distribution.]
