<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Security / Governance
 * File: SECURITY_LOG.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Tracking security debt, audit bypasses, and remediation targets.
 * Traceability: [Traceability]
 * ======================================================================== -->

# 🛡️ Pharos Security Log

## ⚠️ Active Bypasses

### 1. [2026-04-17] NPM Audit Bypass: `yaml` Package
- **Component**: `apps/marketing`, `apps/demo` (DevDependencies)
- **Vulnerability**: Stack Overflow via deeply nested YAML collections (GHSA-48c2-rrv3-qjmp)
- **Impact**: Low. This is a vulnerability in the Astro language server / YAML language server used only during development. It does not affect the production runtime.
- **Reason for Bypass**: Standard `npm audit fix` requires breaking changes to `@astrojs/check`. Bypassed to allow the Truth Engine CI/CD pipeline to proceed.
- **Remediation**: Update Astro and language server dependencies once a non-breaking patch is released.

---

## 🛡️ Audit History
- **Phase 1.4**: Integrated Truth Engine validation. SSRF Sentinel verified.
- **Phase 1.4**: File Prologue Audit active in `scripts/pulse.sh`.
