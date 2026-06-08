<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0057-public-search-and-authenticated-fulfillment.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the "Discovery vs. Fulfillment" boundary for search and data access.
 * Traceability: Issue #204, ADR-0006, ADR-0026, ADR-0056
 * Status: Proposed
 * ======================================================================== -->

# ADR 0057: Public Search & Authenticated Fulfillment

## Context
Pharos Kitchen Design (Project Prism) prioritizes a **Command-First UX (ADR-0006)**. To maximize adoption and eliminate friction for the Independent Kitchen Designer (IKD), the ability to discover equipment metadata must be instantaneous and unrestricted. However, to maintain **Data Sovereignty (ADR-0015)** and enforce **Sovereign Authority (ADR-0056)**, the act of "Fulfillment" (obtaining the actual binary or forking the data) must be a privileged operation.

## Decision
We are implementing a strict "Discovery vs. Fulfillment" boundary:

1.  **Stateless Public Search (Discovery)**:
    - The **Tantivy Search Index (`search-index.bin`)** is a public, unauthenticated artifact hosted on Cloudflare R2.
    - Any actor (Guest or Authenticated) can download the index and perform local searches using the WASM-based `pkd-core` engine.
    - **Attribute Visibility**: Only fields marked as `Public` in the RFC 2378 schema (ADR-0023) are included in the public search index.

2.  **Stateful Authenticated Fulfillment (The Action Gate)**:
    - Any command that results in data egress, local persistence, or state modification REQUIRES a valid **Sovereign Passkey** session.
    - **Gated Commands**:
        - `pkd core pulse` (Binary/Dialect Sync)
        - `pkd registry fork` (Sanctuary Creation)
        - `pkd download` (Binary Export)
    - Upon invoking a gated command, the system MUST check for an active session. If none exists, it MUST return an `AUTHENTICATION_REQUIRED` Resolution Hint.

3.  **The "Expert Potential" Tease**:
    - Public search results will include "Hero Metadata" (Name, Model, Basic Specs) to demonstrate the capability and value of the platform, while high-value forensic or staff-specific metadata remains excluded from the public index.

4.  **UX Transition**:
    - The UI (Web/Revit) MUST allow users to search and view public metadata as a "Guest."
    - The **"Action Gate"** (e.g., clicking 'Download' or 'Fork') will trigger the biometric Passkey challenge.

5.  **Index Scalability (The "Big Data" Sentinel)**:
    - To preserve the "Command-First" performance (ADR-0006), the system will utilize a **Progressive/Sharded Indexing** model.
    - **Global Surface Index**: A lean, high-level index for broad discovery (target < 50MB).
    - **Category Shards**: Deep, forensic metadata indexes (e.g., `shards/refrigeration.bin`) are lazily downloaded only when the user's design context or search query requires them.

## Rationale
- **Frictionless Onboarding**: Allows designers to verify the tool's utility and "Expert Capability" before committing to a biometric identity.
- **Resource Protection**: Prevents "Anonymous DoS" on the D1 identity database by offloading search to a stateless, client-side WASM engine.
- **Security**: Aligns with **Zero-Trust Distribution** by ensuring that no proprietary binary or dialect ever touches a disk without a proven identity.
- **Performance**: Sharded indexing ensures that the "Discovery" phase remains fast and low-bandwidth even as the registry grows to enterprise scale.

## Impact
- **Architecture**: The `pkd-core` Search Engine must support lazy index shard loading.
- **Infrastructure**: The R2 repository structure must organize index shards by equipment category.
- **CLI/UI**: Implementation of the `Action Gate` logic and progress indicators for shard fetching.

## Verification
- **Integration Test**: Verify that a Guest user can run `pkd query hobart` and receive results from the Surface Index.
- **Security Test**: Verify that `pkd core pulse` fails with `AUTHENTICATION_REQUIRED` when no session is present.
- **Scalability Test**: Verify that the system only downloads the `refrigeration` shard when a refrigeration-specific query is executed.
