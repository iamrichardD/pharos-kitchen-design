/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: 0016-shift-left-security-and-automated-audit.md
 * Status: Approved
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying automated vulnerability auditing in the test cycle.
 * Traceability: GEMINI.md, ADR 0005
 * ======================================================================== */

# ADR 0016: Shift-Left Security & Automated Audit

## Context
Manual security auditing is prone to "toil" and forgetfulness. To ensure the integrity of the PKD ecosystem, vulnerabilities in both the Node.js (Astro) and Rust (pkd-core) stacks must be identified and remediated before any task closure.

## Decision
1. **Integrated Audit Script**: Add a root-level `npm run audit` script that executes `npm audit --workspaces` and `cargo audit`.
2. **Container-Enforced Validation**: Update `Containerfile.test` to install `cargo-audit` and prepending the audit script to the default test command (`npm run audit && npm test`).
3. **Zero-Tolerance Policy**: Any vulnerability detected during the `test:container` run is considered a build failure and must be remediated (via `npm audit fix` or version updates) before a merge to `main`.

## Rationale
By forcing audits inside the Podman container, we achieve **Environment Parity** and ensure that no task can be "validated" if it introduces or ignores security risks. This aligns with the "High-Rigor Engineering" mandate in ADR 0005 and GEMINI.md.

## Impact
- Build times in the container will increase due to `cargo install cargo-audit` and the audit check.
- Security becomes a proactive, non-negotiable part of the development lifecycle.
- Increased confidence for manufacturers and designers regarding the safety of the Pharos toolset.
