## 🎯 Fix Summary (Mandatory)
<!-- Provide a concise, high-signal overview of what was resolved and WHY. Reference ADRs or Issues. This is a foundational mandate of Pharos Handover Protocol. -->

### Changes in [Component Name]
- [ ] List logical updates and why they were necessary.

## 🚀 ADR-0017: Implementation Strategy
<!-- Document the Three-Option Crucible-Slice evaluation if non-trivial (ADR-0017). -->
- **Selected Strategy:** [Option A/B/C]
- **Rationale:** Why was this path promoted over others?
- **Alternatives Evaluated:** Briefly describe the discarded options.

## ⚔️ The Pharos Crucible (Audit Log)
<!-- This section is populated by the Auditor Agent and verified by the HitL. 
     Refer to [.github/PRACTICES.md](.github/PRACTICES.md) and [.github/CRUCIBLE_HEURISTICS.md](.github/CRUCIBLE_HEURISTICS.md) -->
- [ ] **Beck (Feedback):** TDD traceability and YAGNI compliance confirmed.
- [ ] **Martin (Structure):** SOLID/SRP and Fail-Fast Sentinels verified.
- [ ] **Fowler (Evolution):** Ubiquitous Language and VSA isolation confirmed.
- [ ] **Zero-Host:** Verified in Podman container (`scripts/pulse.sh`).

## 🎓 Instructive Peer Review Log
<!-- Summarize the key mentorship-focused inline comments provided during the review loop. -->
- [ ] [Comment 1 Summary: The Why & How]
- [ ] [Comment 2 Summary: The Why & How]

## 🛡️ Security Review (Shift-Left)
<!-- Document potential attack vectors identified and mitigated during the Research phase. -->
- [ ] **Input Validation:** How are malformed or malicious inputs handled?
- [ ] **Data Integrity:** Is the "Metadata-First Truth" protected?
- [ ] **FFI/IPC Safety:** Are there memory leak, panic, or buffer overflow risks?

## 📊 DORA Metrics
- **Lead Time:** [Total time from Research start to PR creation]
- **Change Failure Rate:** [Results from Podman/Zero-Host test verification]
- **Deployment Frequency:** [Branch status / Release readiness]

Closes #[Issue Number]
