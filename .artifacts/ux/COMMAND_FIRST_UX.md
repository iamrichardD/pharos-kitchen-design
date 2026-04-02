/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: UX Specification
 * File: COMMAND_FIRST_UX.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1
 * Purpose: Detailed interaction spec for the Omni-Bar and Truth Inspector.
 * ======================================================================== */

# UX Specification: Command-First Interaction

## 1. The Omni-Bar (Primary CLI)
- **Shortcut:** `/` to focus.
- **Commands:**
    - `/add [query]`: Search and place equipment.
    - `/export [target]`: Export to Revit (RFA), AutoCAD (DWG), or JSON.
    - `/validate`: Run schema audit on the current workspace.
- **UI:** Fixed top-center, width 600px, `Prism Indigo` border, `BIM Slate` background.

## 2. The Truth Inspector (Metadata Sidebar)
- **Visibility:** Toggleable via `/inspect` or clicking equipment.
- **Sections:**
    - `Identity`: UUID, Model, Manufacturer.
    - `Utilities`: Gas, Electric, Water, Waste nodes.
    - `Validation`: "Pharos Verified" status badge.

## 3. Design Tokens (Prism System)
- `bg-primary`: #0F172A (BIM Slate)
- `border-accent`: #06B6D4 (Deterministic Cyan)
- `action-primary`: #4F46E5 (Prism Indigo)
- `font-ui`: Inter
- `font-data`: JetBrains Mono
