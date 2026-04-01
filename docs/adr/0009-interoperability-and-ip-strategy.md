/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Legal
 * File: 0009-interoperability-and-ip-strategy.md
 * Status: Approved
 * ======================================================================== */

# ADR 0009: Interoperability & IP Strategy (The "Lawfare" Defense)

## Context
The project operates in a highly litigious industry dominated by legacy incumbents. To protect the project, its contributors, and its users (IKDs), we must establish a clear legal rationale for our interoperability logic.

## Decision
Adopt the **"Bridged-Interface"** strategy for all interoperability-focused code and documentation.
1.  **Legal Foundation**: Formally invoke the **17 U.S.C. § 1201(f)** exception for reverse engineering to achieve software interoperability.
2.  **Taxonomy**: Use **`Bridged-`** as the prefix for file names and **`PKD_Interop_`** for internal mapping properties.
3.  **Transparency**: Maintain a root-level **`DISCLAIMER.md`** stating non-affiliation and honoring third-party trademarks as "Nominative Fair Use."

## Rationale
This strategy demonstrates **"Good Faith"** intent. In a legal context, using neutral, functional terms like "Bridged" or "Interop" signals that the project is an independent "Interoperability Bridge" rather than a brand-confusing clone. This is the strongest defensive posture for a bootstrap project seeking future investment.

## Impact
- All public-facing documentation and sample data will use the "Bridged" taxonomy.
- Actual competitor GUIDs and raw forensics logs are restricted to the gitignored `.project/` and `.artifacts/` directories.
- The project is positioned as a pro-competitive, interoperability-first tool.
