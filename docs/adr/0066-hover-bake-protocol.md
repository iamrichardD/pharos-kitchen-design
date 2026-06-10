<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Architecture
 * File: 0066-hover-bake-protocol.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Mandating procedural geometry generation for zero-latency 3D discovery.
 * Traceability: Issue #235, ADR-0003, ADR-0057
 * Status: Proposed
 * ======================================================================== -->

# ADR 0066: The Hover-Bake Procedural Protocol

## Context
Legacy commercial kitchen design software relies on 800GB+ of static binaries (RFA, DWG, OBJ). Delivering this volume via the browser or standard cloud sync is a performance blocker for the "Command-First UX" (ADR-0006).

## Decision
Pharos will utilize a **"Procedural-Only"** discovery visualization protocol:

1.  **Metadata as Geometry**: 3D previews are generated strictly from the `GeometryManifest` (JSON) stored in the metadata.
2.  **Resident Baking**: All vertex arrays and mesh data must be calculated within the **Resident WASM Core** on the client machine.
3.  **No Binary Downloads**: It is strictly PROHIBITED to download pre-baked binary models (OBJ/GLB) during the discovery phase.
4.  **The Hover Trigger**: The bake protocol must be triggered by a `UI_HOVER` event on the fulfillment list, with a target "Time-to-Interactive-Mesh" of **< 100ms**.

## Rationale
- **Zero-Latency**: Eliminates the network tax of downloading heavy 3D assets.
- **Data Sovereignty**: The manufacturer's intellectual property is protected by shipping only the *instructions* to generate the shape, rather than the final high-fidelity mesh.
- **Infinite Scalability**: A registry of 100,000 items remains lightweight because the "weight" of the geometry is offloaded to local computation.

## Impact
- **Core Engine**: The `pkd-core` must implement the `ProceduralGenerator` trait for all equipment categories.
- **UI**: The Demo and Revit apps must support real-time mesh rendering from raw vertex buffers.

## Traceability
- [IKD Golden Path](../plans/IKD_GOLDEN_PATH.md)
- [ADR-0003 (Metadata Reduction)](0003-market-aware-metadata-reduction.md)
- [ADR-0057 (Discovery vs. Fulfillment)](0057-public-search-and-authenticated-fulfillment.md)
