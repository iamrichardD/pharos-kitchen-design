/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: 0012-marketing-ia-and-design-system.md
 * Status: Approved
 * ======================================================================== */

# ADR 0012: Marketing IA & Visual Design System

## Context
To secure financial backing and community adoption, the marketing site must reflect the project's high-performance engineering and "Investable" professionalism. It must serve as both a technical documentation hub and a strategic value proposition.

## Decision
Adopt a **"Minimalist Industrial"** design system and a **Task-Oriented** Information Architecture.

### 1. Information Architecture (Multilingual)
All routes will support `en-US` and `es-MX` (e.g., `/es/roadmap`).
- **`/` (The Manifesto)**: High-level value prop (IKD Empowerment, Metadata-First).
- **`/roadmap`**: Interactive visualization of the 5-Phase G11n Matrix.
- **`/interoperability`**: Technical/Legal foundation of the **Bridged-Interface**.
- **`/docs`**: Searchable index of all ADRs and Architecture diagrams.

### 2. Visual Design Standard
- **Aesthetic**: "Technical Blueprint" (High contrast, grid-based, functional).
- **Typography**: Primary: `Roboto Condensed` (for data-density); Secondary: `Inter` (for legibility).
- **Colors**:
    - **Base**: `#1A1A1A` (Charcoal)
    - **Accent**: `#FF6B00` (Safety Orange - Action/CTAs)
    - **Secondary**: `#005FB8` (Blueprint Blue - Logic/Docs)
- **Imagery**: SVG-based system diagrams and 3D WASM equipment previews.

### 3. CTA Strategy (The Conversion Path)
- **Designer Path**: "Star on GitHub" -> "View POC Demo."
- **Manufacturer Path**: "Download PKD Metadata Spec" -> "Submit Data for Normalization."
- **Investor Path**: "Read Technical Whitepaper" -> "Request Project Financial Brief."

## Rationale
This architecture eliminates "Marketing Fluff" and focuses on **Utility and Transparency**. The minimalist industrial aesthetic signals engineering maturity, while the task-oriented routes ensure that every visitor (Designer, Manufacturer, Investor) finds their specific "Unit of Success" immediately.

## Impact
- Scaffolding of `/apps/marketing` will follow this exact route structure.
- CSS/Tailwind configuration will be standardized to this color/type palette.
- Project velocity will increase by eliminating "Design-by-Committee" during implementation.
