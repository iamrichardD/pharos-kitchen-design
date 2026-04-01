/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: 0010-globalization-and-regional-parity.md
 * Status: Approved
 * ======================================================================== */

# ADR 0010: Globalization (G11n) & Regional Parity

## Context
Commercial kitchen design is a global industry with strict regional engineering standards (Voltage, Frequency, Units, Certifications). Legacy software often forces manual conversion or maintains separate, bloated libraries for different markets.

## Decision
Implement a **"Market-First" Globalization Engine** within the PKD ecosystem.
1.  **Unit-Agnostic Core**: Store all internal metadata values in a standardized base (Metric/SI) and use **"Regional Masks"** for display and BIM injection.
2.  **Dynamic GUID Overrides**: The `pkd-bridge` will swap Revit SharedParameter GUIDs based on the `PKD_TargetMarket` attribute (e.g., swapping FCSI-US GUIDs for IFSE-EU GUIDs).
3.  **Project Fluent (i18n)**: Adopt the **Mozilla Fluent** standard for all UI strings, pluralization, and technical error messages.
4.  **Market-Based Stripping**: Automatically strip irrelevant regional data (e.g., UL certifications for EU projects) to enforce the **50KB Bloat Rule**.

## Rationale
Ensures the software is "Market-Aware" by default. This empowers the IKD to specify equipment for any region with deterministic accuracy, eliminating the "toil" of manual unit conversion and reducing Revit project bloat.

## Impact
- **Metadata Clarity**: Every piece of equipment has a defined `PKD_TargetMarket`.
- **Global Search**: The Command-First UX (Cmd+K) will support multi-language semantic search.
- **Investor Appeal**: Positions Pharos as a globally scalable platform from Day 1.
