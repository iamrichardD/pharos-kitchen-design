/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: docs/adr/0044-automated-boundary-enforcement.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify the "Single Boundary Mandate" for FFI and Schema integrity.
 * Traceability: Issue #168, ADR-0016, ADR-0025, ADR-0040
 * Status: Proposed
 * ======================================================================== */

# ADR-0044: Automated Boundary Enforcement (The Single Boundary Mandate)

## Context
As Pharos expands across multiple platforms (Rust, WASM, .NET 8, Astro), the complexity of maintaining synchronization across these boundaries increases. Manual updates to `DllImport` signatures in C# and `#[no_mangle]` exports in Rust are prone to human error, leading to memory corruption, crashes, or "Silent Data Corruption."

Current safeguards (ADR-0016, ADR-0025) provide runtime checks, but lack an automated mechanism to prevent architectural drift between components during parallel engineering.

## Decision
We implement the **Automated Boundary Enforcement** mandate, formally known as the **"Single Boundary Mandate."**

### 1. The Boundary Marshal Protocol
- **Sovereign Source**: `packages/pkd-core/src/bindings.rs` is the authoritative source for all cross-language signatures.
- **Panic Isolation Mandate**: Every exported function MUST utilize `std::panic::catch_unwind` to prevent Rust panics from crossing the ABI boundary.
- **Structured Response**: All FFI calls MUST return a `PkdBuffer` containing a serialized `InteropResponse` (JSON), ensuring uniform error handling.

### 2. Automated Signature Verification
- **Build-Time Sentinel**: The CI pipeline MUST include a step that validates the synchronization between Rust exports and C# `DllImport` declarations.
- **Checksum Gate**: A hash of the `bindings.rs` file will be tracked. Any change to this file triggers a mandatory audit of all downstream bridges (`revit-bridge`, `auth-bridge`).

### 3. Memory & Security Sentinels
- **Maximum Payload**: A hard sentinel of `MAX_JSON_SIZE = 1MB` is enforced at the entry point of every boundary-crossing function.
- **SafeHandle Sovereignty**: All pointers returned from Rust MUST be wrapped in a .NET `SafeHandle` (e.g., `PharosSchemaHandle`, `SafePkdBufferHandle`) to ensure deterministic cleanup via the GC.
- **No Manual Pointers**: Direct `IntPtr` manipulation in the bridge logic (outside of `SafeHandle` initialization) is prohibited.

### 4. Integration Order
- If multiple shards (parallel agents) modify the boundary, the **SPM** MUST enforce **Sequential Integration Order**. Parallel merges to the boundary are strictly prohibited to prevent race conditions in the ABI signature.

## Rationale
- **Reliability**: Eliminates the "Hallucination Gap" in cross-language communication by making the boundary self-documenting and self-verifying.
- **Security**: Hard limits on payload size and structured error reporting prevent common FFI attack vectors (Buffer Overflow, DoS via memory exhaustion).
- **Efficiency**: Reduces debugging toil by ensuring that ABI mismatches are caught at build-time rather than runtime.

## Consequences
- **Positive**: significantly lower regression rates in the `revit-bridge`; improved confidence for parallel agent teams.
- **Negative**: Increased build-time overhead due to signature verification steps.
- **Mitigation**: Utilize lightweight hashing and AST analysis for verification rather than full compilation where possible.

## Traceability
- **Security**: [ADR-0016: Shift-Left Security](docs/adr/0016-shift-left-security-and-automated-audit.md)
- **Interop**: [ADR-0025: Modern-Only Interop Mandate](docs/adr/0025-modern-only-interop-mandate.md)
- **Regression**: [ADR-0040: Mandatory Regression Surface Mapping](docs/adr/0040-mandatory-regression-surface-mapping.md)
