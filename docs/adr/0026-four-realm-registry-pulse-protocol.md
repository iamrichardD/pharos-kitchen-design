<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0026-four-realm-registry-pulse-protocol.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Defining the 4-realm data isolation and cache synchronization strategy.
 * Traceability: Issue #46, Issue #50, ADR-0015
 * Status: Active
 * ======================================================================== -->

# ADR 0026: The Four-Realm Registry & "Pulse" Startup Protocol

## Context
Pharos Kitchen Design (Project Prism) requires a cost-efficient, high-rigor data pipeline to bridge the "Home Lab" (Extraction/Transformation) and the "Production" IKD terminal (Search/Loading). The existing architecture lacks a defined mechanism for environment isolation and efficient remote searching across thousands of sharded metadata files without a centralized backend.

## Decision
We will implement a 4-tier Realm system for data isolation and a "Pulse" startup event for automatic cache synchronization.

1.  **Define Four Realms**:
    - **`local`**: Raw Extraction. Data source: SQLite (`truth_engine.db`). Used for forensic discovery and initial verification.
    - **`dev`**: Local Sandbox. Data source: Local Filesystem (`.artifacts/registry/`). Used for verifying the "Bake" (JSON/Index) on the Human Engineer's machine.
    - **`stage`**: Pre-release UAT. Data source: GitHub Pages (`/staging/`). Used for testing remote synchronization before production release.
    - **`prod`**: Authoritative Truth. Data source: GitHub Pages (`/root/`). The authoritative CDN for IKD users.

2.  **Sharded Storage & Binary Indexing**:
    - Metadata is stored as individual `[SKU].json` files with a `_prologue` key for agentic traceability.
    - Search is powered by a binary **Tantivy index** (`search-index.bin`) generated during the ETL "Bake" process.

3.  **The "Pulse" Protocol**:
    - On CLI startup (throttled by a 1-hour TTL), the `pkd` binary checks the remote CDN for a new `search-index.bin` via ETag/Last-Modified headers.
    - Updates are downloaded to realm-specific cache paths (XDG standard for `prod`, project-relative for `dev/stage`).
    - **SHA-256 Verification**: Mandatory checksum validation is performed after every download to ensure data integrity and security.
    - **Fail-Soft**: If the network is unavailable, the CLI will default to the local cache and print: `[Info] Network unavailable, using local cache.`

## Rationale
- **Cost Sovereignty**: Maintains $0 OpEx by utilizing GitHub Pages as a CDN and the Human Engineer's physical compute for extraction.
- **Performance**: In-memory binary search (Tantivy) eliminates the need for expensive server-side compute or slow file-by-file crawling.
- **Isolation**: Prevents development experimentation (e.g., malformed JSON) from leaking into the IKD's professional workspace.
- **Data Sovereignty**: IKDs retain local copies of the registry, ensuring the Pharos toolset remains functional even in disconnected or subterranean environments (Subway Mode).

## Impact
- **CLI Command**: Introduction of the `--env [local|dev|stage|prod]` global flag.
- **Protocol Upgrade**: Upgrading `pharos-protocol` to support logical `OR` for complex registry queries.
- **Workflow Expansion**: Introduction of a "Bake" step in the ETL pipeline to generate the binary index and sharded JSON from the raw SQLite database.
- **Security**: Hardened data delivery through mandatory hashing and ETag verification.

## Verification
- CLI "Pulse" event unit tests with mocked CDN headers.
- Multi-realm cache isolation checks in the Podman environment.
- SHA-256 failure path verification (Fail-Fast on corrupted indexes).
