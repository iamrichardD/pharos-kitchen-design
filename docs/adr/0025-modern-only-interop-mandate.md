<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0025-modern-only-interop-mandate.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Mandating .NET 8.0+ for all C# Interop components.
 * Traceability: Issue #32, Revit 2025 SDK
 * Status: Active
 * ======================================================================== -->

# ADR 0025: Modern-Only Interop Mandate (.NET 8.0+)

## Context
Pharos Kitchen Design (Project Prism) is a forward-looking BIM ecosystem. Legacy AEC software has historically been burdened by the .NET Framework 4.8 ecosystem. With the release of Revit 2025, Autodesk has transitioned its API surface to .NET 8.0.

To maintain **Metadata-First Truth** and reduce "BIM Bloat," Pharos must avoid the technical debt associated with supporting legacy .NET Standard 2.1 or .NET Framework 4.x compatibility layers.

## Decision
We will exclusively target **.NET 8.0** (and future modern .NET versions) for all C# Interop components, specifically the `revit-bridge`.

1.  **Drop .NET Standard 2.1**: Remove all multi-targeting and legacy fallback logic.
2.  **Native UTF-8 Marshalling**: Utilize `Marshal.PtrToStringUTF8` as the primary mechanism for Rust-to-C# string transfer.
3.  **Modern Primitives**: Leverage `Span<T>`, `Memory<T>`, and `System.Text.Json` for high-performance metadata handling.

## Rationale
- **Architectural Purity**: Aligning with Revit 2025's move to .NET 8 eliminates the need for complex "Polyfill" logic in the bridge.
- **Performance**: Modern .NET provides significant performance improvements in JIT compilation and memory management, critical for processing large kitchen equipment registries.
- **Security**: .NET 8 includes modern security defaults and better support for authenticated IPC (Inter-Process Communication) required by the Pharos Auth Bridge.
- **Maintenance**: Reduces "Toil-Cost" by eliminating cross-framework testing and build complexity.

## Impact
- **Breaking Change**: The `revit-bridge` will no longer compile for or run in Revit 2024 or earlier.
- **Code Cleanup**: `RevitBridge.cs` will be refactored to remove `#if` conditional compilation and legacy marshalling loops.
- **Build System**: `PkdRevitBridge.csproj` will be simplified to a single target framework (`net8.0`).

## Verification
- Build verification in Podman using the `mcr.microsoft.com/dotnet/sdk:8.0` image.
- FFI stability checks using modern .NET marshalling primitives.
