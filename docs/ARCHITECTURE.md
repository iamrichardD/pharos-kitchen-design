/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: ARCHITECTURE.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * Purpose: Mermaid visualizations for Human-AI contextual alignment.
 * Traceability: UX/VSA Strategy Approved 2026-03-31
 * ======================================================================== */

# Pharos Architectural & UX Visualizations

## 1. System Hierarchy (The Ultimate Stack)
Illustrates the interaction between the Desktop wrapper, the Web frontend, and the high-performance Rust/WASM core.

```mermaid
graph TD
    subgraph "Desktop Layer (Tauri + Rust)"
        T[Tauri App] --> RC[Rust Core Engine]
        RC --> BR[Bridge Spoofer / GUID Mapping]
        BR --> RV[Autodesk Revit IPC]
    end

    subgraph "Frontend Layer (Astro + WASM)"
        T --> A[Astro UI / Apps]
        A --> IS[Astro Islands]
        IS --> W[WASM Logic Module]
    end

    subgraph "Data Layer (JSON-First)"
        S[(Pharos Schema)] --> RC
        S --> W
        M[(Manufacturer Samples)] --> S
    end

    RC -.->|Compiled to| W
```

## 2. Command-First UX Workflow (IKD Empowerment)
Visualizes the "Hybrid Spotlight" interaction designed to eliminate search-and-click toil for Independent Kitchen Designers.

```mermaid
sequenceDiagram
    participant IKD as Kitchen Designer
    participant S as Spotlight Search (Cmd+K)
    participant W as WASM Previewer
    participant B as Pharos Bridge
    participant R as Revit Model

    IKD->>S: Types "208v Hobart LXeH"
    S->>S: Filter by Metadata (Volts + Brand)
    S->>W: Load LOD 100/300 Proxy
    W-->>IKD: Instant 3D Connection Point Preview
    IKD->>S: Hits "Enter" (Selection)
    S->>B: Trigger Spoofing Logic
    B->>B: Map Forensic GUIDs (e2105edf...)
    B->>R: Inject Parametric Family
    R-->>IKD: Equipment Schedule Populated
```

## 3. Vertical Slice Architecture (VSA) Map
The monorepo is organized by **Business Value (Equipment Category)** rather than technical layers.

```mermaid
graph LR
    subgraph "Packages (Shared Truth)"
        CORE[pkd-core: Rust/WASM]
        UI[pkd-ui: Shared Components]
    end

    subgraph "Slices (Business Value / Equipment)"
        WASH[Warewashing Slice]
        COOK[Cooking Slice]
        REFR[Refrigeration Slice]
    end

    subgraph "Apps (Delivery)"
        MARK[Marketing Site]
        DEMO[POC Demo / Spotlight]
    end

    WASH --> CORE
    COOK --> CORE
    REFR --> CORE

    CORE --> DEMO
    DEMO --> MARK
```

## 4. Deployment Pipeline (Nested Monorepo Build)
Illustrates the CI/CD flow for deploying the unified monorepo to GitHub Pages.

```mermaid
flowchart LR
    G[GitHub Push] --> AC[GitHub Action]
    
    subgraph "Build Phase"
        AC --> B1[Build Marketing /apps/marketing]
        AC --> B2[Build Demo /apps/demo]
        B2 --> WASM[Compile Rust to WASM]
    end
    
    subgraph "Packaging"
        B1 --> DIST[dist/ Folder]
        B2 -.->|Nested| NEST[dist/demo/ Folder]
    end
    
    DIST --> GP[GitHub Pages Deployment]
    GP --> URL[iamrichardd.com/pharos-kitchen-design/]
```

## 5. Fail Fast Engineering (The Sentinel Strategy)
Pharos implements a "Fail Fast" strategy to eliminate the "Hallucination Gap" and reduce debugging toil.

*   **System Seams:** Invariants are checked at every system boundary (CLI-to-Bridge, Bridge-to-Cognito, Core-to-Revit).
*   **Informative Failure:** Errors MUST include specific context (e.g., specific missing field names or file paths) to ensure 30-second root-cause identification.
*   **No Masking:** The system is prohibited from "failing slowly" through default values or `null` workarounds for critical data.

---
### Legal & Interoperability Compliance
**Pharos Kitchen Design** (Project Prism) is an independent software development effort. Use of any third-party trademarks (e.g., KCL, AutoQuotes, Hobart, Vulcan) is strictly for **Nominative Fair Use** to identify compatibility and achieve software interoperability under **17 U.S.C. § 1201(f)**. Please see [DISCLAIMER.md](../DISCLAIMER.md) for full legal disclosures.
