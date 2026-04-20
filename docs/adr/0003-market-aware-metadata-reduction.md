<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0003-market-aware-metadata-reduction.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: [Purpose]
 * Traceability: [Traceability]
 * Status: Approved
 * ======================================================================== -->

# ADR 0003: Market-Aware Metadata Reduction

## Context
Identifying supported markets (US, EU, Asia) for legacy KCL integration to further optimize metadata and reduce bloat.

## Decision
Implement a **`PKD_TargetMarket`** parameter to drive region-specific metadata stripping and GUID spoofing.

## Rationale
KCL supports 150+ countries with varying regional standards (FCSI USA, IFSE BIM, CE, UL). Pruning irrelevant certifications and utility data (e.g., stripping 60Hz/UL data for 230V/CE markets) further reduces the "MVM" (Minimum Viable Metadata) payload size.

## Impact
- `pharos-schema.json` and `BRIDGE_SCHEMA.json` will be updated to support market-based logic.
- Pharos-generated families are contextually lean for their target geography.
