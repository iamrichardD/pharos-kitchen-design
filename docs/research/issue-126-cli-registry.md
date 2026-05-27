/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Research
 * File: docs/research/issue-126-cli-registry.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Strategic research for Phase 5.4: CLI Registry Management Subcommands.
 * Traceability: Issue #126
 * ======================================================================== */

# Strategic Research: CLI Registry Management Subcommands (Issue #126)

## 1. Background & Motivation
Phase 5.4 aims to provide high-rigor management of the Pharos Registry via the `pkd` CLI. This involves formalizing the distribution lifecycle—from extracting local metadata to pushing sharded archives to remote realms. This aligns with ADR-0026 (Four-Realm Registry Pulse Protocol) and ADR-0027 (Organization-Based Authority Scopes).

Based on SPM guidance, the architecture will adopt **Option A**: creating a dedicated `pkd registry` namespace. This adheres strictly to Vertical Slice Architecture (VSA) and the Single Responsibility Principle (SRP) by decoupling local engine operations (`core`) from network-bound distribution operations (`registry`).

## 2. Scope & Impact
- **Namespace Migration**: Existing distribution commands (`bake`, `promote`, `pulse`, `verify`) will be migrated from `pkd core` to `pkd registry`.
- **Target Audience**: Original Equipment Manufacturers (OEMs) submitting their content, and Pharos Infrastructure maintainers orchestrating remote states.

## 3. Proposed Solution: The `pkd registry` Taxonomy

The following subcommands will constitute the `pkd registry` namespace:

### 3.1 `pkd registry bake`
- **Intent**: Transforms raw JSON shards into a compressed Tantivy index and archive (`search-index.tar.zst`), along with a SHA-256 integrity manifest.
- **Parameters**: 
  - `--source <PATH>`: Directory containing JSON shards.
  - `--output <PATH>`: Destination for the compiled archive.
  - `--shard-id <ID>` (Optional): Enables incremental baking for a specific manufacturer shard.
- **Fail-Fast Gates**: Pre-validates all JSON against the Pharos Schema before initiating the expensive index generation.

### 3.2 `pkd registry verify`
- **Intent**: Performs deep integrity checks on local and remote registry artifacts, ensuring cryptographic parity with expected SHA-256 hashes.
- **Parameters**:
  - `--path <PATH>`: Local path to verify.
  - `--remote` (Flag): Check the authoritative manifest on the current environment's CDN (e.g., Cloudflare R2).

### 3.3 `pkd registry push` (replaces `promote`)
- **Intent**: Promotes baked artifacts to remote realms (`dev`, `stage`, `prod`).
- **Parameters**:
  - `--source <PATH>`: The directory containing the baked archive.
  - `--env <REALM>`: Target deployment environment.
  - `--shard-id <ID>`: The specific shard being pushed.
- **Security Implications (Shift-Left)**:
  - Validates `custom:organization` and `custom:scope` claims from the current JWT session against the `--shard-id`. OEMs are restricted to pushing to their assigned namespaces.
  - Generates the `Content-SHA256` HTTP header for S3/R2 requests to ensure transit integrity.

### 3.4 `pkd registry pulse`
- **Intent**: High-rigor system health and synchronization check (migrated from `core pulse`). Ensures the local state is synchronized with the remote authoritative manifest.
- **Parameters**: 
  - `--env <REALM>`

### 3.5 `pkd registry status` (New)
- **Intent**: Provides a developer-friendly diagnostic output showing current registry version, local cache path (XDG), selected environment realm, and time since last sync.

## 4. TDD Strategy: Atomic Verification (Phase 1 Gate)
To ensure high-rigor implementation, the following atomic test cases will be developed *before* implementation:

- `test_should_reject_push_when_jwt_organization_mismatch`: Verify that an OEM user with `custom:organization: FRYMASTER` cannot push to `shard-id: VULCAN`.
- `test_should_fail_fast_when_bake_source_contains_invalid_json`: Ensure the bake engine terminates immediately if any shard violates the Pharos Schema.
- `test_should_return_integrity_failure_when_archive_hash_mismatch`: Verify that `registry verify` detects tampered `.tar.zst` files.
- `test_should_isolate_cache_by_environment`: Ensure that `registry pulse --env dev` does not overwrite the `prod` cache directory.
- `test_should_emit_deprecation_warning_on_legacy_core_pulse`: Verify that the transition logic correctly guides users to the new namespace.

## 5. Regression Surface Map (ADR-0040)
The following areas are identified as high-risk for regressions during the namespace migration:

| Area | Risk | Mitigation |
| :--- | :--- | :--- |
| **`pkd core search`** | Accidental breakage of positional search fallback. | Mandatory smoke test for `pkd manufacturer=3m`. |
| **CI/CD `pulse.yml`** | CI failure due to renamed `core pulse` command. | Synchronized update of all GHA workflows. |
| **Documentation** | Stale instructions in `CLI_REFERENCE.md`. | Complete IA pass by `PHAROS_IA_CORE`. |
| **Auth Lifecycle** | Token retrieval failure for registry push. | Use existing `AuthManager` with verified `keyring` integration. |

## 6. Local Security Architecture: JWT Management
To protect designer and OEM credentials, the `pkd` CLI will adhere to the following security standards:

- **Storage**: Authentication tokens (JWTs) will be stored in the **System Keyring** (GNOME Keyring, macOS Keychain, Windows Credential Manager) using the `keyring-rs` crate.
- **Service Scoping**: Tokens will be stored under the service name `pharos-registry-auth` to prevent collision with other applications.
- **In-Memory Hygiene**: Sensitive tokens will be handled as `SecretString` or wiped from memory after use to prevent exposure in core dumps.
- **Transport Security**: All registry operations (`push`, `pulse`) will enforce TLS 1.3 for communication with the Pharos Identity Bridge and Cloudflare R2.

## 7. UX Flow: The OEM Content Lifecycle
1. **Extraction**: OEM utilizes transformation logic to produce Pharos-compliant JSON shards locally.
2. **Baking**: OEM executes `pkd registry bake --source ./shards --output ./dist --shard-id frymaster-v1`.
3. **Verification**: OEM executes `pkd registry verify --path ./dist` to validate integrity.
4. **Promotion**: OEM executes `pkd registry push --source ./dist --env stage --shard-id frymaster-v1`. The CLI authenticates the user, verifies the `custom:organization` claim, and uploads the verified payload to Cloudflare R2 via `aws-sdk-s3`.
5. **Synchronization**: Downstream CLI clients run `pkd registry pulse --env stage` to detect and download the new shard.

## 8. Migration Strategy (Architectural Debt Remediation)
Migrating from `core` to `registry` introduces breaking changes to existing documentation and pipelines:
1. **Update CI/CD Pipelines**: Modify `pulse.yml` and related workflows to invoke `pkd registry pulse` instead of `pkd core pulse`.
2. **Update CLI Reference**: Revise `docs/CLI_REFERENCE.md` and user guides to reflect the new taxonomy.
3. **Deprecation Notice**: Temporarily alias `pkd core pulse` to emit a deprecation warning guiding users to the `registry` namespace, followed by eventual removal.

## 9. Security Analysis (Shift-Left)
- **Identity Bridge Authentication**: Every `registry push` must be accompanied by a valid JWT from the Pharos Identity Bridge.
- **Organization-Based Scoping**: The CLI must verify that the `custom:organization` claim in the JWT matches the `shard-id` being pushed.
- **Bucket-Level Isolation**: Staging and Production buckets on Cloudflare R2 must have strict IAM/Bucket policies allowing only the Pharos Bridge (or signed CLI requests) to write to specific prefixes.
- **Checksum Verification**: Mandatory SHA-256 verification at the Edge (Cloudflare Workers) and the Client (pkd registry pulse) ensures that "Truth" is never corrupted in transit.
