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
