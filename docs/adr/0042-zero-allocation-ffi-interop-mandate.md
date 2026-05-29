<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0042-zero-allocation-ffi-interop-mandate.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify the performance requirement for cross-language boundaries.
 * Traceability: Issue #123, ADR-0030
 * Status: Approved
 * ======================================================================== -->
# ADR-0042: Zero-Allocation FFI Interop Mandate

*   **Status**: Approved
*   **Date**: 2026-05-29
*   **Deciders**: Senior BIM Developer, Pharos Meta-Architect (PMA)
*   **Traceability**: Issue #123, ADR-0030

## Context
Pharos relies on high-frequency communication between a Rust performance core and various high-level consumers (.NET 8 for Revit, TypeScript/WASM for Web). Legacy FFI patterns often rely on string marshaling (`PtrToStringUTF8`), which triggers significant GC pressure during bulk metadata hydration (e.g., loading 500+ commercial kitchen components). This degrades user experience through viewport stutter and increased latency.

## Decision
All non-trivial data exchange across language boundaries MUST utilize **Zero-Allocation Marshalling**:

1.  **Direct Memory Access**: Utilize `ReadOnlySpan<byte>` (.NET) or similar primitives to read directly from Rust-allocated length-prefixed buffers (`PkdBuffer`).
2.  **Intermediate Buffer Elimination**: The creation of intermediate `System.String` or temporary heap objects for the sole purpose of marshaling is strictly PROHIBITED in the hot path.
3.  **Synchronous Consumption**: To ensure memory safety, native pointers MUST be consumed synchronously within the scope of the safe handle lifecycle.

## Rationale
- **Performance**: Eliminating GC pressure is vital for maintaining 60FPS interactivity in BIM software.
- **Modernity**: Leverages the high-performance native interop capabilities of .NET 8.0 and WASM.
- **Predictability**: Reduces the "Performance Variance" caused by non-deterministic garbage collection cycles.

## Consequences
- **Developer Rigor**: Requires higher expertise in `unsafe` code and memory lifecycle management.
- **Safety Overheads**: Requires strict adherence to the `SafePkdBufferHandle` pattern to prevent Use-After-Free (UAF) vulnerabilities.
