## 🎯 Fix Summary (Mandatory)
<!-- Provide a concise, high-signal overview of what was resolved and WHY. Reference ADRs or Issues. This is a foundational mandate of Pharos Handover Protocol. -->

### Changes in [Component Name]
- [ ] List logical updates and why they were necessary.

## 🚀 ADR-0017: Implementation Strategy
<!-- Document the Three-Option Crucible-Slice evaluation if non-trivial (ADR-0017). -->
- **Selected Strategy:** [Option A/B/C]
- **Rationale:** Why was this path promoted over others?
- **Alternatives Evaluated:** Briefly describe the discarded options.

## 🛡️ Security Review (Shift-Left)
<!-- Document potential attack vectors identified and mitigated during the Research phase. -->
- [ ] **Input Validation:** How are malformed or malicious inputs handled?
- [ ] **Data Integrity:** Is the "Metadata-First Truth" protected?
- [ ] **FFI/IPC Safety:** Are there memory leak, panic, or buffer overflow risks?

## 📊 DORA Metrics
- **Lead Time:** [Total time from Research start to PR creation]
- **Change Failure Rate:** [Results from Podman/Zero-Host test verification]
- **Deployment Frequency:** [Branch status / Release readiness]

## 🧩 Interoperability & Quality Check
- [ ] Verified in Podman Zero-Host environment (`scripts/test-bridge.sh`).
- [ ] Schema compliance confirmed against `pkd-core/schema/pharos-schema.json`.
- [ ] **Mentorship:** Inline comments provide "Why/How" without meta-labels.

Closes #[Issue Number]
