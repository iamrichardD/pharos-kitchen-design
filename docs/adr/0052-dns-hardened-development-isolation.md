<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Architecture / Governance
 * File: 0052-dns-hardened-development-isolation.md
 * Author: PMA (via Gemini CLI)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the DNS-hardened container isolation strategy.
 * Traceability: Issue #218, Issue #220
 * Last Updated: 2026-06-05
 * ======================================================================== -->

# ADR-0052: DNS-Hardened Development Isolation

## Status
Approved (2026-06-05)

## Context
During high-rigor development in Podman containers, we encountered name resolution failures (e.g., `deb.debian.org`, `registry.npmjs.org`) within the default bridge network. This often led to the use of `--network host` as a pragmatic workaround to unblock dependency fetching.

However, `--network host` breaks the security boundary between the guest container and the host system, violating our **Zero-Host Execution** philosophy. It allows guest processes to see host loopback services and bypass container-level network controls.

## Decision
We explicitly **PROHIBIT** the use of `--network host` in all Pharos development and CI/CD wrappers (e.g., `scripts/podman-wrapper.sh`). 

Instead, we mandate **DNS-Hardened Isolation**:
1. Containers MUST remain in the isolated bridge network.
2. Name resolution failures MUST be resolved by providing an explicit, authoritative DNS resolver (e.g., `--dns 1.1.1.1` for Cloudflare or `--dns 8.8.8.8` for Google).
3. This configuration MUST be codified in the `podman-wrapper.sh` to ensure universal environment parity.

## Rationale
- **Security**: Preserves the principle of least privilege. A compromised third-party build image remains trapped in the bridge network.
- **Reliability**: Decouples container name resolution from potentially flaky or restricted host-level DNS forwarders.
- **Parity**: Ensures that a build which passes locally on a developer's machine will behave identically in a "Nuclear" GitHub Actions environment.

## Impact
- **Security Posture**: 🟢 Improved. The developer's host network is no longer exposed to guest containers.
- **Workflow**: 🟡 Neutral. Dependency fetching is now reliable without manual network hacking.
- **Infrastructure**: All Podman-based scripts must be updated to include the `--dns` flag.
