<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0045-continuous-supply-chain-verification.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify the mandate for immutable SHA-256 base image pinning.
 * Traceability: Issue #169, ADR-0016
 * Status: Approved
 * ======================================================================== -->
# ADR-0045: Continuous Supply Chain Verification

*   **Status**: Approved
*   **Date**: 2026-05-29
*   **Deciders**: Senior Pharos Program Manager (SPM), Pharos Meta-Architect (PMA)
*   **Traceability**: Issue #169, ADR-0016

## Context
As Pharos transitions to a multi-platform distribution model, the integrity of our build and validation environments becomes a primary security vector. Relying on mutable tags (e.g., `latest` or `node:24`) introduces "Poisoned Layer" risks and environmental drift. To ensure the **Pharos Standard** of reproducible builds, we require a machine-verifiable mechanism to enforce supply chain integrity.

## Decision
We will implement and enforce a **Continuous Supply Chain Verification** protocol:

1.  **Immutable Image Pinning**: ALL monorepo `Containerfile`s MUST strictly utilize immutable SHA-256 digests for base images (e.g., `FROM image:tag@sha256:...`).
2.  **The Registry Audit Warden**: The `pkd registry audit` command is established as an authoritative security gate. It will audit the monorepo for:
    *   Unpinned container images.
    *   Deprecated or high-risk NPM packages (e.g., `prebuild-install`).
    *   Unpinned or wildcard dependency versions in `package.json` and `Cargo.toml`.
3.  **Mandatory Pulse Integration**: The supply chain audit MUST execute at the beginning of the `pulse.sh` pipeline. Any violation will trigger an immediate Fail-Fast exit.

## Rationale
- **Security (Shift-Left)**: Cryptographic pinning eliminates a broad class of supply chain attacks.
- **Reproducibility**: Ensures that local dev, CI, and production environments utilize bit-for-bit identical toolchains.
- **Fail-Fast**: Detecting security violations in seconds (via static audit) is superior to waiting for full build cycles.

## Consequences
- **Maintenance Overhead**: Updating toolchains requires updating SHA-256 digests (manual or automated).
- **Reduced Friction**: Developers get immediate feedback on dependency risks before committing code.
