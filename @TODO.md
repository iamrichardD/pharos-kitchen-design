<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Project Management / Backlog
 * File: @TODO.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central tracking for Phase-specific tasks and issues (Present & Future).
 * Traceability: Issue #207
 * Last Updated: 2026-06-29
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

### Sprint 5.05: Milestone 5 - Performance & Launch (2026-07-06) - 🚀 ACTIVE
- [ ] **Issue #239**: [TAG: UX] Refactor Marketing Site IA for Command-First Identity. [DESC: Implement high-fidelity Terminal Hero and capability-based documentation flow. Requires 50% Mid-Sprint Rigor Gate review.] [ECT: 5]
- [ ] **Issue #313**: [TAG: IA] Refactor Navigation Layout and Naming Taxonomy. [DESC: Reorganize header page links to standard terminology (Guide, Reference, Blog, About) using a config-driven array layout.] [ECT: 2]
- [ ] **Issue #312**: [TAG: UX] Resolve Mobile Navigation Horizontal Overflow. [DESC: Investigate and implement responsive header navigation layout to prevent horizontal overflow in portrait mobile orientations using VoidZero hamburger drawer pattern.] [ECT: 2]
- [ ] **Issue #311**: [TAG: UX] Implement Dynamic Login and Settings Navigation Link. [DESC: Develop client-side <pharos-nav-auth> Custom Element and SessionManager utility to swap between Login and Settings dynamically without layout shift.] [ECT: 2]
- [ ] **Issue #185**: [TAG: Perf] Zero-Allocation JSON Parsing. [DESC: Implementing source-generated JSON parsers to eliminate allocation overhead in WASM.] [ECT: 3]
- [ ] **Issue #42**: [TAG: Security] SRI & SEO Audit. [DESC: Remediating SRI hashes and optimizing SEO for the Marketing site.] [ECT: 2]
- [ ] **Issue #84**: [TAG: Infra] Dual-Stream Release Pipeline. [DESC: Configuring separate channels for stable and nightly releases.] [ECT: 2]
- [ ] **Issue #85**: [TAG: Infra] Official Homebrew Tap. [DESC: Initializing the official Pharos Homebrew tap for macOS/Linux distribution.] [ECT: 2]

---

## 📅 Future Sprints

### Sprint 6.01: Milestone 6 - Enterprise Sync & Multi-Org (2026-07-20) - 🔮 PLANNED
- [ ] **Issue #87**: [TAG: Security] Domain-to-Org Mapping. [DESC: Implementing secure domain validation for organizational onboarding.] [ECT: 3]

---

## ❄️ Backlog Icebox (Unassigned)

- [ ] **Issue #268**: [TAG: Infrastructure] Design Production Split boundaries. [DESC: Decouple production infrastructure stages to isolate networking blocks.] [ECT: 3]
- [ ] **Issue #257**: [TAG: UI] Enforce Reference Validation. [DESC: Add runtime validators for Three.js layout elements.] [ECT: 2]
- [ ] **Issue #256**: [TAG: UI] Standardize Web Components. [DESC: Refactor custom layout components to strictly inherit standard bindings.] [ECT: 2]
- [ ] **Issue #253**: [TAG: Security] Cryptographic signature validation. [DESC: Implement runtime checks for search index binary signatures.] [ECT: 3]
- [ ] **Issue #251**: [TAG: Debt] Refactor Schemas. [DESC: Optimize JSON validation templates for manufacturer datasets.] [ECT: 4]
- [ ] **Issue #227**: [TAG: UI] Implement Info Cards. [DESC: Build interactive hover metadata panels for Three.js canvas items.] [ECT: 2]
- [ ] **Issue #226**: [TAG: Security] Purge Legacy SQLite modules. [DESC: Remove dead sqlite libraries to decrease Tauri compile overhead.] [ECT: 2]
- [ ] **Issue #225**: [TAG: UI] Implement Vfs boundary checks. [DESC: Restrict file read scopes in local loaders.] [ECT: 3]
- [ ] **Issue #212**: [TAG: Debt] Decommission old AWS credentials. [DESC: Purge vestigial IAM secrets from GitHub variables.] [ECT: 1]
- [ ] **Issue #211**: [TAG: Debt] Purge vestigial auth routes. [DESC: Deprecate endpoint routes bypassed by passkey auth.] [ECT: 1]
- [ ] **Issue #209**: [TAG: Governance] Document BIM Standard. [DESC: Publish comprehensive guide for manufacturer schema adherence.] [ECT: 2]
- [ ] **Issue #193**: [TAG: Security] Remediate critical NPM warnings. [DESC: Apply overrides to resolve nested vulnerable dependencies.] [ECT: 2]
- [ ] **Issue #192**: [TAG: Security] Remediate high vulnerability NPM packages. [DESC: Patch devalue, fast-uri, and js-cookie vulnerabilities. Note: Astro >= 5.0.0 and happy-dom fixes are already completed.] [ECT: 3]
- [ ] **Issue #184**: [TAG: Debt] Implement Rust unit tests for Dialects. [DESC: Ensure True and Frymaster dialers have 100% logic test coverage.] [ECT: 2]
- [ ] **Issue #144**: [TAG: UI] IKD Empowerment Hub UI. [DESC: Build workspace interface for solo designers.] [ECT: 4]
- [ ] **Issue #89**: [TAG: UI] Develop Manufacturer Onboarding Portal. [DESC: Build interface for uploading OEM dialects.] [ECT: 4]
- [ ] **Issue #28**: [TAG: Core] Shared Design Schema standardization. [DESC: Re-align JSON dialect structures across Revit and Three.js.] [ECT: 4]
- [ ] **Issue #278**: [TAG: Governance] Implement webMCP metrics endpoint to expose DORA and sprint telemetry. [DESC: Implement /mcp/metrics route in apps/marketing using Astro endpoint handlers to serve JSON telemetry.] [ECT: 2]
