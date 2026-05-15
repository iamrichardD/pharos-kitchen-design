# Pharos High-Rigor Retrospective Template (PHR-RT v2)

<!-- 
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: RETROSPECTIVE_TEMPLATE.md
 * Purpose: Standardized template for DORA-driven issue retrospectives.
 * Traceability: ADR-0030
-->

**Issue/PR:** #[Number] / #[PR Number]  
**Goal:** [Summary of the Strategic Intent]  
**Date:** [Date of Completion]  
**Team Keywords:** `PHAROS_STRATEGY_CORE`, `PHAROS_DEV_CORE`

---

#### 1. 📊 Complexity & Velocity Analysis (ADR-0030)
*   **Estimated Complexity Tier (ECT):** [1-5]
*   **Actual Complexity Tier (ACT):** [1-5]
*   **Velocity Variance:** [ECT - ACT]
*   **Friction Analysis:** Why did the actual effort deviate from the estimate? (e.g., Environment Mismatch, API Gaps, Security Debt).

#### 2. 🛡️ Security & Hardening Retrospective
*   **Attack Vectors Remediated:** [List from Research phase]
*   **Residual Risks:** Are there any known security gaps left open for velocity? (Trace to `SECURITY_LOG.md`).
*   **Warden Integrity:** Did the Temporal Warden or safety sentinels encounter any "Real-World" triggers during validation?

#### 3. 📈 DORA & Efficiency Audit
*   **Active Labor Time (ALT):** [Total minutes spent in Research + Execution]
*   **Wall Clock Time (WCT):** [Total elapsed minutes from Issue start to Merge]
*   **Process Efficiency Ratio (PER):** [(ALT / WCT) * 100]%
*   **Change Failure Rate:** [Number of CI/Remediation cycles]

#### 4. ⚔️ The "Brutally Honest" Evaluation (GEMINI.md)
*   **What Went Well:** (High-signal wins, structural successes).
*   **What Failed:** (Tooling friction, process delays, logic errors).
*   **The "Hallucination Gap":** Did any assumptions made during Research prove false during Execution?

#### 5. 🎓 Lessons for Agentic Continuity
*   **Future Mandates:** Do we need to update `GEMINI.md` or an ADR based on this session?
*   **Mentorship Points:** Key takeaways for future developers/agents working on this vertical slice.
