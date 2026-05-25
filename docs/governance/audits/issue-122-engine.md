# Phase 4 Crucible Audit: Shard #122.2 (Rust Extrusion Generator)
**Auditor:** PHAROS_STRATEGY_CORE (The Antagonistic Mentor)
**Status:** 🟡 AMBER (Remediation Required)
**Date:** 2024-05-14

## ⚖️ Post-Hoc Crucible (ADR-0017)
**Problem:** The Builder bypassed the Mandatory Three-Option Crucible. 
**Evaluated Strategy:** JIT Baking on Metadata.

| Strategy | Speed | Scale | Security | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **JIT Baking (Implemented)** | Moderate | High (Lazy) | High | **ACCEPTED** (with remediation) |
| **Pre-Bake** | High | Low (Bloated) | High | REJECTED (Wasteful) |
| **On-Demand FFI** | Low | High | Moderate | REJECTED (Chatty/Latent) |

**Conclusion:** JIT Baking is architecturally sound for LOD 200, but the implementation lacks the "Pharos Rigor".

## 🛡️ Audit Mandates

### 1. Architectural Audit (Senior BIM Developer)
- **Math Robustness:** 🔴 **FAIL**. `extrusion.rs` uses direct `f64` comparison (`<= 0.0`). This is amateur hour. BIM geometry requires epsilon-guarded checks (`f64::EPSILON` or a domain-specific tolerance).
- **SRP Violation:** 🔴 **FAIL**. `PharosMetadata::bake_geometry()` is a breach of separation. The data model is now "contaminated" with procedural generation logic. Geometry generation must be decoupled.
- **Capabilities:** 🟡 **WEAK**. `ExtrusionGenerator` is narrow. It lacks support for Sweeps, Revolves, or even basic profile variations.

### 2. Security Audit (DevSecOps)
- **FFI Boundary:** 🟢 **PASS**. `MAX_JSON_SIZE` (1MB) is correctly enforced in `bindings.rs`.
- **Memory Exhaustion:** 🟢 **PASS**. The registry handles memory limits (64MB) and eviction effectively.
- **Panic Safety:** 🟢 **PASS**. `catch_unwind` and `AssertUnwindSafe` are used correctly at the FFI boundary.

### 3. Performance & Gap Analysis (PMA/DX)
- **JIT Latency:** 🟡 **CAUTION**. While fast for single items, `bake_geometry` inside `pkd_get_ghost_metadata` adds overhead to the Revit event loop. Benchmarks for batch hydration are missing.
- **Authoritative Seam:** Aligns with the Metadata-First mandate, but the procedural logic is "Hidden Truth" rather than "Declared Truth".

### 4. IA Review (SPIA)
- **Naming:** 🔴 **FAIL**. `ExtrusionGenerator` is a feature, not a component. It should be part of a `GeometryEngine` or `ProceduralBridge`.

## 📜 Remediation Plan
1.  **Decouple Geometry:** Move `bake_geometry` out of `PharosMetadata`. Use a dedicated `GeometryService` or Trait-based dispatcher.
2.  **Hardened Math:** Implement epsilon-based checks for all dimensional comparisons.
3.  **Engine Evolution:** Rename `ExtrusionGenerator` to `ProceduralGenerator` and support more operation types.

---
**Final Verdict:** 🟡 AMBER. The core is stable but "lazy". Clean up the SRP violations and harden the math before merging to `main`.
