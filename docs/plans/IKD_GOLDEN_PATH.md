<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Plans
 * File: IKD_GOLDEN_PATH.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Authoritative User Journey for Independent Kitchen Designers (IKD).
 * Traceability: Issue #235, ADR-0006, ADR-0057, RFC-2378
 * Last Updated: 2026-06-10
 * ======================================================================== -->

# The IKD Golden Path: Command-to-Canvas

This document defines the high-rigor interaction lifecycle for the Independent Kitchen Designer (IKD) within the Pharos ecosystem. It bridges the gap between technical WASM capability and product vision.

## 1. Phase 1: Discovery (RFC-2378 OmniBar)
The OmniBar is the primary interface for equipment discovery. It implements the [RFC-2378 Protocol](../../.project/rfc2378.md) for precise, key-value querying.

### Interaction Verbs
- `/add [query]`: Searches the Global Surface Index and presents a fulfillment list.
- `/export [format]`: (Gated) Generates Revit or CAD files from the current stage.
- `/help`: Displays contextual guidance and available metadata keys.

### Intent Mapping
| Human Input | RFC-2378 Command | System Action |
| :--- | :--- | :--- |
| `manufacturer=3M` | `find manufacturer=3M` | Filter Surface Index by Mfr |
| `description=Water Filtration` | `find description="Water Filtration"` | Refine results by Category |
| `/add Hobart LXeR` | `find manufacturer=Hobart model=LXeR` | Direct discovery to fulfillment |

## 2. Phase 2: Visualization (The Hover-Bake)
Pharos eliminates the 800GB "Legacy Ghost" by using procedural geometry. As per [ADR-0066](../adr/0066-hover-bake-protocol.md), no binary models are downloaded during discovery.

- **Trigger**: User hovers over a search result in the fulfillment list.
- **Protocol**: 
    1. The OmniBar dispatches the `GeometryManifest` (JSON) to the resident Rust core.
    2. The `ProceduralGenerator` bakes the vertex array in WASM memory.
    3. Three.js renders the result instantly on the 3D Stage.
- **Target Latency**: < 100ms for "Expert Flow State."

## 3. Phase 3: Fulfillment (The Action Gate)
The transition from "Viewing" to "Using" is guarded by [ADR-0057](../adr/0057-public-search-and-authenticated-fulfillment.md).

- **Action**: User clicks 'Import' or '/export'.
- **Challenge**: If no passkey session exists, show `[HINT] AUTHENTICATION_REQUIRED`.
- **Egress**: Upon success, the `GeometryManifest` is signed and dispatched to the local `pkd-bridge`.

## 4. Phase 4: Realization (Native Revit Handshake)
The final step in the Golden Path is the injection of the design intent into the native CAD environment.

- **Transport**: Secured local websocket via `pkd-bridge`.
- **Injection**: The Revit plugin receives the signed manifest and uses the C# Procedural Engine to generate native Revit families on-the-fly.

***

## Traceability & References
- **Architecture**: [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
- **Search Spec**: [docs/search-specification.md](../search-specification.md)
- **UX Prototype**: `apps/marketing/public/command-v1/index.html`
- **Security**: [ADR-0023 (Fail-Fast)](../adr/0023-rfc2378-and-fail-fast-integration.md)
