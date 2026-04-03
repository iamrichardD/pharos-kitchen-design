/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: 0015-ikd-centric-marketing-and-truth-engine.md
 * Status: Approved
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Strategic pivot for IKD marketing and metadata governance.
 * Traceability: ADR 0012, RFC-2378
 * ======================================================================== */

# ADR 0015: IKD-Centric Marketing & Live-Sync Truth Engine

## Context
The Pharos marketing site must move beyond static documentation to demonstrate active engineering rigor to the Independent Kitchen Designer (IKD). Initial research reveals that legacy manufacturer data is often stale or inaccurate (e.g., 3M URLs), necessitating a shift from "Data Conversion" to "Data Sovereignty."

## Decision
1. **Live-Sync Truth Narrative**: Position Pharos as a "Truth Engine" that seeds from legacy data but verifies against manufacturer live portals on a 30-day "Pulse" cycle.
2. **RFC-2378 (Ph) Integration**: Reuse the "CCSO Nameserver" metadata keywords (`Sacred`, `Change`, `Lookup`) to define field-level data governance. 
3. **Maturity over Certification**: Replace "Pharos Certified" claims with a "Maturity Matrix" visualizing "Sync Vitality" and "Metadata Fidelity" (Raw, Normalized, Verified).
4. **Living Instructions**: Utilize Playwright to generate automated screenshots of the prototype for instructional use on the `/bridge` and `/features` pages.
5. **WebMCP North Star**: Highlight the Model Context Protocol (WebMCP) as the bridge for agentic AI use cases.

## Rationale
By treating equipment data as a "Nameserver for Machines," we provide the IKD with a deterministic, low-toil infrastructure. Reusing the RFC-2378 logic provides technical "street cred" and ensures our metadata model is grounded in proven Internet architecture.

## Impact
- Scaffolding of `apps/marketing` will use Astro 5.x and Tailwind CSS.
- New `coverage.astro` page will be data-driven, reflecting "Sync Vitality."
- Personal brand continuity is maintained through sub-path deployment (`/pharos-kitchen-design/`) and Umami analytics.
