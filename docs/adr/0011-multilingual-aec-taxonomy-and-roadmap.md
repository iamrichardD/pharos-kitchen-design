/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: 0011-multilingual-aec-taxonomy-and-roadmap.md
 * Status: Approved
 * ======================================================================== */

# ADR 0011: Multilingual AEC Taxonomy & Global Roadmap

## Context
AEC software must be globally accessible yet regionally precise. To secure venture capital and achieve rapid market adoption, the project needs a clear path for expansion from North America to the global market.

## Decision
Establish **US English (`en-US`)** and **Mexican Spanish (`es-MX`)** as the **Dual-Primary Languages** for all Pharos Kitchen Design (PKD) tools, marketing, and production environments. Implement a 5-phase **Multilingual Market Adoption Matrix**.

### 1. Multilingual Market Adoption Matrix
| Phase | Region | Primary Language(s) | Technical Standards |
| :--- | :--- | :--- | :--- |
| **P0: Launch** | **USA / Mexico** | **`en-US`, `es-MX`** | UL / NOM / NSF / Imperial + Metric |
| **P1: North-Am** | **Canada** | `en-CA`, `fr-CA` | CSA / Hybrid Units |
| **P2: LATAM** | **C. & S. America** | `es-419` | 220V/50Hz / SEC / IRAM |
| **P3: EMEA** | **EU / UK / UAE** | `en-GB`, `de-DE`, `fr-FR` | CE / REACH / Metric / 230V |
| **P4: APAC** | **China / SE Asia** | `zh-CN`, `zh-HK`, `vi-VN` | GB Standards / 220V |

### 2. Technical Implementation
- **Project Fluent**: Use the Mozilla Fluent standard for high-fidelity technical translations.
- **WASM Locales**: Compile `pkd-core` with support for real-time locale and unit-system switching.
- **Dual-Primary Mandate**: All P0 marketing, dashboards, and error messages MUST be available in `en-US` and `es-MX`.

## Rationale
`en-US` provides the global engineering foundation, while `es-MX` secures the largest contiguous Spanish-speaking market and serves as the gateway to LATAM. This "Americas-First" focus maximizes immediate ROI and demonstrates "Global Scale Readiness" to potential investors.

## Impact
- **Marketing**: `iamrichardd.com/pharos-kitchen-design/` will support `en` and `es` paths.
- **Schema**: Manufacturers can provide technical specs in multiple languages via the `translations` block.
- **UX**: The Command-First UX (Cmd+K) will support semantic search in both primary languages.
