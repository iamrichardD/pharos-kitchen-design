<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Architecture / Governance
 * File: 0053-authoritative-consent-gate-protocol.md
 * Author: PMA (via Gemini CLI)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the 'Blessing' ritual for upstream SRI hashes.
 * Traceability: Issue #220, Issue #221
 * Last Updated: 2026-06-05
 * ======================================================================== -->

# ADR-0053: Authoritative Consent Gate Protocol

## Status
Approved (2026-06-05)

## Context
Pharos utilizes Sub-resource Integrity (SRI) to protect users from malicious upstream script changes (e.g., Umami Analytics). However, third-party script volatility (unversioned script updates) caused repetitive build failures on the `main` branch, as the hardcoded SRI hashes in our layouts became stale.

Updating these hashes manually was high-toil and reactive, leading to a "Fragile Truth" where security rigor competed with build stability.

## Decision
We will implement an **Authoritative Consent Gate** for all upstream assets:
1. **The Blessed Store**: SRI hashes for all external scripts MUST be stored in a machine-readable local fact file (`apps/marketing/scripts/blessed-hashes.json`).
2. **Deterministic Build**: The build process (via `verify-sri.sh`) MUST compare upstream hashes against the **Local Blessed Store** only.
3. **Upstream Detection**: If an upstream script changes, the build MUST fail, but with a guided remediation message.
4. **The Blessing Ritual**: Upstream updates require an explicit **Blessing Commit**. A developer/auditor must run a local tool (`bless-sri.sh`) which fetches the new hash, displays an audit warning, and updates the local store. 
5. **Human Signature**: The resulting changes MUST be reviewed and committed manually. "Auto-blessing" in CI is strictly prohibited.

## Rationale
- **Intentionality**: Transforms an automated failure into a conscious decision. We only use upstream code we have "consented" to.
- **Stability**: Prevents uncoordinated upstream updates from breaking our deployment pipeline.
- **Traceability**: Every hash change is now linked to a specific git commit and human signature.

## Impact
- **Reliability**: 🟢 100% build determinism for the `main` branch.
- **Security**: 🟢 Maintained high rigor. We still detect drift, but we manage the integration.
- **DX**: 🟢 Guided remediation replaces frustrating "black-box" failures.
