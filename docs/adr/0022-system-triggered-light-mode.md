<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / UX
 * File: 0022-system-triggered-light-mode.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Defining the strategy for system-triggered light mode and adaptive assets.
 * Traceability: ADR 0012, ADR 0015, ADR 0017
 * Status: Proposed
 * ======================================================================== -->

# ADR 0022: System-Triggered Light Mode & Adaptive Assets

## Context
The Pharos marketing site currently uses a hardcoded dark theme. To improve accessibility and designer comfort in high-glare environments (e.g., job sites), we require a light mode that maintains our high-rigor "Technical Blueprint" aesthetic.

## Decision

### 1. Zero-JS Theme Toggling
We will utilize the CSS `prefers-color-scheme` media query to toggle theme tokens. This ensures instant response to system settings with zero performance overhead and zero JavaScript maintenance.

### 2. The "Architectural Vellum" Palette
The light mode will mimic high-quality architectural vellum:
- **Primary Background**: `slate-50` (#F8FAFC)
- **Technical Grid**: `ph-blue` at 10% opacity
- **Primary Text**: `ph-charcoal` (#1A1A1A)
- **Accents**: High-contrast `ph-blue` and `ph-orange`

### 3. Adaptive Asset Swapping
To ensure screenshots match the user's system theme, we will standardize on the HTML `<picture>` element.
- Every marketing screenshot MUST have a `-dark.png` and `-light.png` version.
- The browser will natively select the appropriate asset based on the system media query.

```html
<picture>
  <source srcset="screenshot-light.png" media="(prefers-color-scheme: light)">
  <img src="screenshot-dark.png" alt="...">
</picture>
```

### 4. Implementation Tokens (CSS Variables)
We will refactor `global.css` to use the following tokens:
- `--bg-base`: Background color.
- `--text-base`: Primary body text.
- `--grid-line`: Color for the blueprint grid lines.
- `--border-blueprint`: Color for technical borders.

## Rationale
"Option 1 (Native Browser)" was selected via the Three-Option Crucible. It provides the highest performance, lowest maintenance cost ($0), and follows the "Shift-Left Security" principle by avoiding client-side state management scripts.

## Impact
- **Performance**: Zero Time-to-Interactive (TTI) impact.
- **Accessibility**: Better readability in varied lighting conditions.
- **Design**: Maintains the "Project Prism" identity in both light and dark variants.

## Verification Plan
- [ ] Verify color contrast ratios meet WCAG AA standards in both modes.
- [ ] Use browser developer tools to toggle system preference and verify asset swapping.
- [ ] Confirm zero regressions in the Astro static build.
