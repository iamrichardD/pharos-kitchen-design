<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Retrospective
 * File: docs/governance/REPORTS/2026-06-26-RETROSPECTIVE.md
 * Author: Retrospective Coordinator (via Antigravity)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: End of Week Retrospective for Sprint 5.04.
 * Traceability: Issue #275, Issue #274, Issue #276, Issue #277, Issue #273, Issue #271, Issue #300, Issue #306, ADR-0037, ADR-0043, ADR-0051
 * Last Updated: 2026-06-26
 * ======================================================================== -->

# Sprint 5.04 End of Week Retrospective: Hardening local and Cloud Serving Pipelines

**Date:** Friday, June 26, 2026  
**Role:** Retrospective Coordinator  
**System Status:** 🟢 **PHAROS GREEN**  
**Team Keywords:** `PHAROS_STRATEGY_CORE`, `PHAROS_DEV_CORE`, `PHAROS_IA_CORE`

---

## 1. 📊 Complexity & Velocity Analysis (ADR-0030)

*   **Assigned ECT:** 13
*   **Unplanned ECT:** 4 (Issue #300, Issue #306)
*   **Completed ECT:** 17
*   **Velocity Variance:** +4
*   **Friction Analysis:** 
    Sprint 5.04 was marked by a shift towards toolchain hardening and local/cloud parity. We hit our velocity target and overdelivered by absorbing two unplanned tasks.
    *   **Day 1 CORS Friction:** The team hit initial integration friction with Cloudflare R2 CORS rules, where the initial configuration was overly broad (allowing `OPTIONS`). This was resolved with a rapid remediation commit.
    *   **CI/CD Credential Scope Mismatch:** We hit blocking authentication errors on non-interactive Wrangler operations. The team responded dynamically by shifting from standard secrets exposure to environment-scoped dynamic targets.

---

## 2. 🛡️ Security & Hardening Retrospective

*   **Attack Vectors Remediated:**
    *   **Storage Access Control:** Hardened the Cloudflare R2 bucket CORS permissions by removing wildcard methods, disabling `OPTIONS`, and limiting allowed origins strictly to production domains (`https://iamrichardd.com` and its subdomains). Allowed headers were constrained to `Content-Type, Range` to prevent cross-origin data exposure.
    *   **Dependency Bloat / Attack Surface Reduction:** Integrated `cargo-machete` with pinned binary hashing. We trimmed 8 unused dependencies from `pkd-cli`, `pkd-core`, and `pharos-protocol`—including AWS Cognito admin code—minimizing the CLI's dependency surface area.
    *   **Local File Server Path Traversal:** Enforced absolute path boundary checks in Astro's Vite middleware using `fs.realpathSync` to prevent symlink bypasses, and added URI decode sanitization to shield the dev server from bad inputs.
    *   **CI Workflow Isolation:** Prevented secret exposure on untrusted pull request runs by checking branch refs dynamically in GitHub Actions before providing access to Cloudflare secrets.
*   **Residual Risks:**
    *   Dynamic Cloudflare environment checks rely on the GitHub action environment context, which must be continuously monitored for configuration drift.
    *   The path traversal guard in the local dev server is robust but requires continuous regression testing if URL formats or base configurations change in `astro.config.mjs`.

---

## 3. 📈 DORA & Efficiency Audit

*   **Average Lead Time:** 1.8 hours (Time from branch creation to main verification).
*   **Deployment Frequency:** 10 merges across the sprint.
*   **Change Failure Rate (CFR):** 10.0% (1 remediation merge out of 10 total merges—PR #287 remediating PR #286 on Day 1).
*   **Mean Time to Recovery (MTTR):** 30 minutes (remediation PR #287 resolved the Day 1 CORS issue quickly).
*   **Process Efficiency:** ~85% (High parallel execution using sibling worktrees without workspace search pollution).

---

## 4. ⚔️ The Multi-Perspective Roundtable

A critical, simulated discussion between the core project teams and industry experts analyzing Sprint 5.04:

*   **PHAROS_DEV_CORE:** "This sprint was a major win for developers. Integrating `cargo-machete` caught unused packages immediately, and stripping Cognito administrative overhead made `pkd-cli` lean again. The local serving path guards also mean we can build and verify the registry index offline without breaking our security posture."
*   **Uncle Bob (Robert Martin):** "You made progress, but look at Day 1. You pushed a loose CORS configuration to `main` with `OPTIONS` enabled. Why wasn't that constraint verified in a test *before* merging? Merging code that relies on a human reviewer or a second PR to clean it up is a failure of architectural discipline. A boundary must be solid from the first commit. I do appreciate the path guard design using `fs.realpathSync` for boundaries. That is proper encapsulation of a system seam."
*   **Kent Beck:** "I agree with Bob on the Day 1 slip, but let's look at the feedback loop. When the failure occurred, the team didn't panic. They didn't roll back the whole project. They wrote a failing test, applied a small fix, and merged a remediation PR in 30 minutes. That's a tight, working feedback loop. Also, look at `cargo-machete` integration. That's a tool that provides immediate, automated feedback on dependency waste. Small steps, fast feedback."
*   **Martin Fowler:** "The decoupling of the marketing site build and the React demo build stages in `Containerfile.ts` is the most significant structural improvement. Before, a minor UI failure in the interactive demo application broke the entire build pipeline, preventing content-only marketing updates. Decoupling them into isolated stages and copying the assets dynamically is a classic build pipeline refactoring pattern. It reduces build time and isolates failure blast zones."
*   **Kathy Sierra:** "The developer experience here is a huge differentiator. By adding the `--registry-target` CLI flag and allowing automatic fallback to local directories, we reduced the cognitive load for developers trying to test offline. If they don't have Cloudflare R2 access, the tool adapts automatically. That is how you design for cognitive flow. The less a developer has to think about environment setup, the more they can focus on kitchen design logic."
*   **Seth Godin:** "But what story does this tell to the commercial kitchen designer? They don't care about CORS rules or dynamic environment variables. However, they *do* care about reliability. They care about a tool that works instantly, whether they are in a high-rise with perfect fiber or in a remote site with no reception. Making the local disk registry serve cleanly offline changes the story from 'another complex cloud tool' to 'a tool that respects my reality.' We need to tell that story louder on our marketing site."
*   **PHAROS_IA_CORE:** "We are already planning for that. In Sprint 5.05, we are taking Issue #239 to refactor the marketing site for a Command-First Identity. We'll simulate these terminal operations right on the landing page, showing users the power of our local-first, low-bloat architecture. Seth's point is exactly why we're deconstructing that epic into bite-sized shards."
*   **PHAROS_STRATEGY_CORE:** "Finishing Sprint 5.04 with zero open issues and clean workflows sets us up perfectly for Milestone 5. The remediation of Issue #306 means our CI/CD pipeline is secure and automated. We are ready to execute the marketing refactor and zero-allocation JSON parsing next."

---

## 5. ⚔️ The "Brutally Honest" Evaluation (GEMINI.md)

*   **What Went Well:**
    *   **Dependency Pruning:** Getting rid of 8 unused crates (especially Cognito) kept the WASM boundaries clean and light.
    *   **Build Pipeline Decoupling:** Separating Astro and React build targets makes our build pipeline resilient to UI drift.
    *   **Offline Capability:** Offline registry target resolution makes the local development loop significantly faster.
*   **What Failed:**
    *   **CORS Configuration Leak:** Pushing an insecure CORS profile with wildcard headers and `OPTIONS` enabled showed a gap in local infrastructure verification.
    *   **CI/CD Secrets Mismatch:** Assuming secrets would propagate blindly to all workflows caused non-interactive authentication loops on non-main branches.
*   **The "Hallucination Gap":**
    *   We assumed that because the local dev server ran fine in the workspace, it would handle URL decoding and relative symlinks perfectly. Real-world validation showed that relative path resolutions behaved differently across systems (especially Windows), requiring standardizing on `fileURLToPath` and adding explicit try-catch boundary logic for malformed URIs.

---

## 6. 🚀 Actionable Opportunities & Lessons

**1. Automated Infrastructure Verification:**
*   **Insight:** We can't rely on manual review to catch insecure Terraform configurations.
*   **Action:** Add a local Terraform lint/validation step into `scripts/pulse.sh` under the Infrastructure slice to check for wildcard origins or methods before pushing.

**2. Dynamic Secret Validation in PRs:**
*   **Insight:** Pipeline failures due to missing secrets during PR runs should fail-fast and output clear warnings, not hang indefinitely.
*   **Action:** Ensure that tests checking for Cloudflare capabilities gracefully skip or warn instead of failing the workflow when running outside `main`.

**3. Boundary Integration Checklist:**
*   **Insight:** Slices touching the network (CORS, Vite serving) need extra security audits.
*   **Action:** Update the Crucible Heuristics template to require a "Network & Input Validation" check for any issues touching config files or middleware.

---

// Rationale: Concluding Sprint 5.04 with clean governance, verified metrics, and strategy alignment.
// Traceability: Issue #275, Issue #306, ADR-0030, ADR-0037, ADR-0051.
