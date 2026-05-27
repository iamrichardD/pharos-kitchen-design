/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Sibling Progress
 * File: SHARD_PROGRESS.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Shard-based logging for Task #137 and #170.
 * Traceability: ADR-0037, ADR-0043
 * ======================================================================== */

# Shard Progress: feat/issue-137-wasm-context

## ⚡ Summary
Implemented a shared React context (`WasmContext`) for the Astro UI to consolidate WASM core initialization. This reduces network overhead and memory footprint by ensuring the WASM binary is only loaded and initialized once per application session.

## 🟢 PHAROS GREEN Status
- [x] **Implementation**: `WasmContext` and `WasmProvider` created.
- [x] **Integration**: `InteropSandbox` refactored to use shared context.
- [x] **Lift**: `WasmProvider` moved to `DemoLayout.astro` for universal access.
- [x] **Verification**: 7/7 tests passing in Podman (including atomic lifecycle tests).
- [x] **Environment**: Hardened `apps/demo` test environment (unified React 19, added `@testing-library/react`).

## 🛠️ Technical Debt & Hardening
- **React Versioning**: Identified and resolved a "multiple React copies" issue caused by workspace-specific installations. Unified monorepo on React 19.0.0.
- **JSX Transformation**: Explicitly configured `vitest.config.ts` for modern JSX runtime.

## 🚀 Ready for Audit
 Implementation is verified and ready for Crucible Review.

## [2026-05-27] - Boundary Marshaling Protocol Refactor (#170)

### 🏗️ Implementation Summary
- **Refactored** the FFI output boundary in `pkd-core` to use the unified length-prefixed slice pattern (`PkdBuffer`).
- **Eliminated** all remaining `*mut c_char` legacy helpers and `CString` usages in `bindings.rs`.
- **Introduced** `PkdBuffer` (Rust) and matching `[StructLayout(LayoutKind.Sequential)] struct PkdBuffer` (C#) for high-performance, zero-allocation metadata transfer.
- **Updated** `SafePkdBufferHandle` in the Revit Bridge to utilize `Marshal.PtrToStringUTF8(IntPtr, int)` for length-aware string hydration.
- **Remediated** memory cleanup logic to use `Box::from_raw` for length-prefixed byte slices, eliminating the risk of misaligned null-termination.

### ✅ Verification Results
- **CORE Slice**: 🟢 PHAROS GREEN (Rust unit tests and clippy verified).
- **BRIDGE Slice**: 🟢 PHAROS GREEN (16 integration tests passed in Podman).
- **Complexity**: ECT 1 (Surgical Strike).
- **DORA Metrics**:
    - **Lead Time**: 30 Minutes.
    - **Change Failure Rate**: 0%.

### 🛡️ Security Review
- **ReDoS Immunity**: N/A (No regex changes).
- **Memory Safety**: Transitioned from null-terminated strings to length-prefixed buffers, reducing the attack surface for buffer overruns.
- **Supply Chain**: Verified via Podman parity.

## [2026-05-27] - Strategic Research: CLI Registry Subcommands (#126) - REMEDIATED

### 🏗️ Remediation Summary
- **Restored History**: Recovered historical logs for #137 and #170 in `SHARD_PROGRESS.md` following a destructive overwrite error.
- **Phase 1 Gate (TDD)**: Formally documented 5 atomic test cases (e.g., `test_should_reject_push_when_jwt_organization_mismatch`) in the research report.
- **Regression Surface Map**: Implemented ADR-0040 compliance by mapping potential impacts to `pkd core search` and GHA workflows.
- **Security Architecture**: Codified the local security model for JWT storage using `keyring-rs` and system-scoped service names.

### ✅ Strategy Status
- **Namespace Strategy**: Option A (Dedicated `registry` namespace) confirmed.
- **Taxonomy**: `bake`, `push`, `verify`, `pulse`, `status`.
- **Complexity**: ECT 3 (Cross-Cutting Logic).
- **Lead Time**: 2.5 Hours (including remediation).
- **Change Failure Rate**: 100% (initial audit failure).

### 🚀 Ready for Re-Audit
Research document and progress log have been remediated to meet high-rigor standards.
