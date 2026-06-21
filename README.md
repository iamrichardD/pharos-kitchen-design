<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / General Overview
 * File: README.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Root documentation containing architectural stack overview, legal compliance, and local container review instructions.
 * Traceability: General Onboarding & Workflow
 * Last Updated: 2026-06-21
 * ======================================================================== -->

# Pharos Kitchen Design (Project Prism)
**Advancing Open Standards and Interoperability in AEC.**

Pharos Kitchen Design (PKD) is a performance-first, metadata-driven ecosystem designed to empower the **Independent Kitchen Designer (IKD)**. It eliminates "BIM Bloat" by replacing heavy, static Revit families with procedurally generated, sub-1MB proxies through a high-rigor **Bridged Interoperability** layer.

## 🏗️ The Ultimate Stack
PKD is built on a high-performance foundation designed to exceed the **McMaster-Carr** benchmark for low-latency web interactions:
- **Tauri + Rust**: Native Windows/macOS/Linux performance with a <5MB binary footprint.
- **Astro + WASM**: Zero-JS "Island Architecture" with real-time procedural geometry generation.
- **Metadata-First Truth**: 100% deterministic MEP connection points (Volts, GPM, BTU).
- **Interface Normalization**: A legally defensive, forensic bridge for 100% schedule parity with legacy systems.

## 🎯 Core Principles
1.  **IKD Empowerment**: Eliminating search-and-click "toil" via a **Command-First UX** (Cmd+K).
2.  **The 50KB Bloat Rule**: Individual equipment metadata must remain ultra-lean.
3.  **Global Parity**: Native support for **en-US** and **es-MX** with real-time unit switching.
4.  **Shift-Left Security**: Vulnerability identification integrated into the research phase.

## 🛠️ Local Environment Review
To inspect the rendered marketing hub and demo site locally without installing host-side dependencies, start the Astro preview server inside the standard Podman container with port forwarding:

```bash
podman run --rm --security-opt seccomp=unconfined \
  -p 4321:4321 \
  -v "$(pwd):/work:z" \
  -w /work/apps/marketing \
  public.ecr.aws/docker/library/node:24-bookworm \
  npx astro preview --port 4321 --host 0.0.0.0
```

Once running, you can view the live changes at:
- **Marketing Site**: [http://localhost:4321/pharos-kitchen-design](http://localhost:4321/pharos-kitchen-design)
- **Interactive Demo**: [http://localhost:4321/pharos-kitchen-design/demo/](http://localhost:4321/pharos-kitchen-design/demo/)

## 📝 Engineering Traceability
The project follows a high-rigor documentation standard. All architectural and strategic decisions are captured as immutable records:
- **[Decision Log](./docs/DECISION_LOG.md)** (Index)
- **[Architecture ADRs](./docs/adr/)** (Historical Context)
- **[System Visualizations](./docs/ARCHITECTURE.md)** (Mermaid Diagrams)

## ⚖️ Legal & Compliance
Pharos Kitchen Design is an independent software development effort. Use of any third-party trademarks is strictly for **Nominative Fair Use** to identify compatibility and achieve software interoperability under **17 U.S.C. § 1201(f)**.
- **[Disclaimer](./DISCLAIMER.md)**
- **[Security Policy](./SECURITY.md)**
- **[License](./LICENSE)** (FSL-1.1)

---
*Pharos Kitchen Design is built by engineers for designers who value performance and precision.*
