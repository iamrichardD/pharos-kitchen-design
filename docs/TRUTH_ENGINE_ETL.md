/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ETL Strategy
 * File: TRUTH_ENGINE_ETL.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Master blueprint for the Pharos Truth Engine ETL pipeline.
 * Traceability: Issue #46, Issue #47, ADR-0015
 * ======================================================================== */

# ⚔️ Pharos Truth Engine: ETL & Forensic Mapping Blueprint

The Pharos Truth Engine is a deterministic synchronization pipeline designed to evolve commercial kitchen data from static, third-party repositories into a living, verified source of truth directly from the manufacturer.
 It operates on the principle of **"Metadata-First Truth"** and ensures **"Data Sovereignty"** for Independent Kitchen Designers (IKD).

---

## 1. The Three-Stage Pipeline

### Stage 1: Extraction (Discovery Layer)
The engine utilizes a **Deep Crawler (Playwright)** to simulate human-like research.
- **Passive Interception**: Rather than scraping brittle DOM elements, the engine listens to the network stream (`page.on('response')`) to identify direct URIs for PDFs, Images, and Revit Families (.RFA).
- **Signal Invariant Filter**: All discovered assets must pass a **Regex Filter Registry** to ignore UI noise (tracking pixels, social icons). 
- **SSRF Sentinel**: Every URI is validated against the manufacturer's `host` component in the database. Subdomain discovery (e.g., `assets.frymaster.com`) is allowed; third-party leaks are blocked.

### Stage 2: Transformation (Forensic Mapping)
This is the **"Rosetta Stone"** of Pharos. It transforms "Unstructured Slop" into deterministic BIM metadata.
- **Pattern Sovereignty**: Mapping logic is **NOT** hardcoded. It resides in `packages/truth-engine/patterns/{manufacturer}.json`.
- **Manufacturer Dialects**: Each manufacturer has a unique pattern registry. 
    - *Example*: Frymaster `"120V/1PH"` -> `(\d+)V/(\d)PH` -> `{ voltage: 120, phase: 1 }`.
- **Normalization Gate**: Raw strings are passed through the **Weighted Pattern Matcher**. If no pattern matches, the field is flagged as `UNVERIFIED_SLOP` for forensic investigation.

### Stage 3: Loading (Production Sync)
Verified metadata is "baked" into the Pharos ecosystem.
- **Sync Vitality**: The `resources` table tracks `ETag` and `Last-Modified` headers. If the source URI has not changed, the production data remains "Sacred."
- **Sacred Field Policy**: 
    - **Immutable Source**: SKU, Voltage, Phase, and Spec URIs are always owned by the Truth Engine.
    - **Designer Overrides**: Custom labels or project-specific notes are owned by the user and never overwritten by a sync.
- **Edge Handshake**: The marketing site and `revit-bridge` query the **Edge Proxy** to verify asset health before presenting them to the IKD.

---

## 2. Agentic Execution Contract (AEC)

To maintain high rigor, all AI Agents tasking the Truth Engine must adhere to this contract:

```markdown
### 🤖 Task: Invoke Truth Engine
1. **Target**: [Manufacturer Name]
2. **Mode**: [PULSE (Metadata only) | DIVE (Full Crawl)]
3. **Scope**: [ALL | SPEC_SHEETS | IMAGES]
4. **Invariant**: "Do not modify the database schema without an ADR update."
5. **Validation**: "Verify sync vitality in data/truth_engine.db before closing."
```

---

## 3. Operational Observability

### Sync Vitality Metrics
A sync is only considered successful if it satisfies the **Baseline Invariants**:
- **Baseline**: `COUNT(resources WHERE type='PDF') > X` (Manufacturer-specific threshold).
- **Pulse**: No more than 5% of resources should transition to `BROKEN` in a single cycle without triggering a **Forensic Alert**.

### The Forensic Feedback Loop
Every `404` or `403` encountered during a "Hover-Verification" is logged to the `sync_logs`. The **Pharos Forensics Agent** (sub-agent) is automatically triggered to resolve these gaps by locating new URIs or flagging discontinued models.

---

## 4. Manufacturer Onboarding Guide

To add a new manufacturer to the Truth Engine:
1. **Infrastructure**: Add `scheme`, `host`, and `catalog_path` to the `manufacturers` table.
2. **Dialect Discovery**: Task an agent to analyze 10 raw product strings and propose a Regex registry in `packages/truth-engine/patterns/`.
3. **Pulse Validation**: Run a dry-run crawl in the Podman container to verify the SSRF Sentinel correctly allows the asset CDN.
