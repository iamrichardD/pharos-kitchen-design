<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Backlog
 * File: @TODO.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central tracking for Phase-specific tasks and issues (Present & Future).
 * Traceability: Issue #207
 * Last Updated: 2026-06-16
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

### Sprint 5.03: The Ghost & The Bridge (2026-06-15) - 🚀 ACTIVE
- [ ] **Issue #239**: [TAG: UX] Refactor Marketing Site IA for Command-First Identity. [DESC: Implement high-fidelity Terminal Hero and capability-based documentation flow.] [ECT: 5]
- [ ] **Issue #185**: [TAG: Perf] Zero-Allocation JSON Parsing. [DESC: Implementing source-generated JSON parsers to eliminate allocation overhead in WASM.]
- [ ] **Issue #42**: [TAG: Security] SRI & SEO Audit. [DESC: Remediating SRI hashes and optimizing SEO for the Marketing site.]
- [ ] **Issue #87**: [TAG: Security] Domain-to-Org Mapping. [DESC: Implementing secure domain validation for organizational onboarding.]
- [ ] **Issue #270**: [TAG: ci/cd] Refactor Deploy Site Workflow Trigger Paths. [DESC: Add apps/demo/** to the on: push: paths: filter in deploy-site.yml to ensure demo site changes trigger redeployments.] [ECT: 2]
- [ ] **Issue #271**: [TAG: Infrastructure] Implement Cloudflare R2 Upload Pipeline for Search Index. [DESC: Implement S3-compatible R2 upload client in pkd-cli and uncomment/update promotion commands in pulse.yml to target R2 registry bucket.] [ECT: 3]


---

## 📅 Future Sprints

### Sprint 5.04: The Scaling Infrastructure (2026-07-06) - 🔮 PLANNED
- [ ] **Issue #84**: [TAG: Infra] Dual-Stream Release Pipeline. [DESC: Configuring separate channels for stable and nightly releases.]
- [ ] **Issue #85**: [TAG: Infra] Official Homebrew Tap. [DESC: Initializing the official Pharos Homebrew tap for macOS/Linux distribution.]
