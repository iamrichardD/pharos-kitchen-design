# Regression Surface Map: Issue #168 (ADR-0044)

/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: DevSecOps / Forensic
 * File: issue-168-regression-map.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: ADR-0040 compliance for Automated Boundary Enforcement.
 * Traceability: Issue #168, ADR-0040, ADR-0044
 * ======================================================================== */

## 1. Impacted System Seams
| Seam Name | Language/Boundary | Impact Level | Risk Mitigation |
| :--- | :--- | :--- | :--- |
| **FFI Export (bindings.rs)** | Rust -> ABI | High | `catch_unwind`, `PkdBuffer` (Length-Prefixed), `MAX_JSON_SIZE`. |
| **P/Invoke Import (RevitBridge.cs)** | ABI -> .NET 8 | High | `SafeHandle` implementation, Lexical Sentinel (`verify-boundary-sync.py`). |
| **Registry Lifecycle** | Rust/C# Shared Memory | Medium | Deterministic `SafeHandle` cleanup; unit tests for Load/Free. |

## 2. Regression Risk Vectors
- **O1 (Orphaned Imports)**: C# code attempts to call a non-existent Rust function.
    - *Detection*: `verify-boundary-sync.py` now fails build on orphan.
- **P1 (Panic Leaks)**: Rust panic crosses boundary, crashing Revit host.
    - *Detection*: `pkd_trigger_panic` test case verifies structured error instead of crash.
- **M1 (Memory Leaks)**: `PkdBuffer` or Handle memory not released by GC.
    - *Detection*: `SafePkdBufferHandle` and `PharosSchemaHandle` verified in integration tests.

## 3. Atomic Verification Surface (TDD)
- [x] **TestShould_ApplyDeltas_When_SyncStateInvoked**: Guards the "Ghost Tuning" parameters seam.
- [x] **TestShould_ReturnSuccess_When_RegisterShardFetcherInvoked**: Guards the lazy-loading registration seam.
- [x] **TestShould_HandlePanic_When_RustCoreFails**: Guards the panic isolation invariant.
- [x] **TestShould_Fail_When_InvalidJsonProvided**: Guards the deserialization safety seam.

## 4. Hot Paths (Performance Impact)
- **Metadata Fetch**: `pkd_get_ghost_metadata` (Verified zero-allocation string transfer).
- **Validation Loop**: `pkd_validate_with_handle` (Verified resident handle performance).

## 5. Auditor Notes
The implementation of `scripts/verify-boundary-sync.py` provides a deterministic gate for O1. Future bridges (macOS/iOS) MUST be added to the sentinel's path array to maintain the "Single Boundary Mandate."
