/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Documentation
 * File: README.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Technical documentation for the Truth Engine vertical slice.
 * Traceability: Issue #46, Issue #47, ADR-0017
 * ======================================================================== */

# @pkd/truth-engine

The Truth Engine is the core synchronization and discovery layer for Pharos. it implements a deterministic state machine to track manufacturer resource vitality.

## 🏗️ Architecture: The Event-Driven Agent

The engine follows **ADR-0017 (Option 3)**, utilizing a SQLite-backed state machine to ensure "Sync Vitality" across long cycles.

### State Transitions
- **STALE**: Default state for discovered resources. Requires a Vitality Check.
- **PENDING_VERIFICATION**: Resource is currently being probed via HEAD request.
- **HEALTHY**: Resource ETag matches the local manifest. No download required.
- **DIVE_REQUIRED**: Source has changed (ETag mismatch). Full Playwright crawl triggered.
- **BROKEN**: Resource returned 404 or 403. Flagged for Forensic Audit.

## 🛡️ Security: SSRF Sentinel

To prevent Server-Side Request Forgery, the engine enforces a strict **Domain Root of Trust**:
1. It extracts the `host` from the `manufacturers` table.
2. It validates all discovered URIs against this host and its subdomains.
3. Any third-party domain leaks are automatically blocked and logged.

## 🚀 Execution (Zero-Host)

In accordance with the Pharos mandate, this package **MUST** be executed and validated inside a Podman container to ensure binary compatibility for `better-sqlite3` and Playwright.

### Run tests:
```bash
podman run --rm --security-opt seccomp=unconfined pkd-truth-engine sh -c "cd packages/truth-engine && vitest run"
```

### Trigger a Pulse:
```bash
podman run --rm --security-opt seccomp=unconfined -v $(pwd)/data:/work/data:Z pkd-truth-engine
```

## 📂 Directory Structure
- `src/engine.ts`: Core state machine and Playwright crawler logic.
- `src/engine.test.ts`: Atomic verification suite.
- `patterns/`: (Phase 2) Manufacturer-specific Regex dialects for forensic mapping.
