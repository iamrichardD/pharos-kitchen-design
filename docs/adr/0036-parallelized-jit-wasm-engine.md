/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: 0036-parallelized-jit-wasm-engine.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Define the parallelized JIT WASM engine architecture.
 * Traceability: Issue #111
 * ======================================================================== */

# ADR 0036: Parallelized JIT WASM Engine

## Status
Approved (2026-05-19)

## Context
As Pharos scales to handle thousands of BIM artifacts across hundreds of manufacturer dialects, the current synchronous validation and registry lookup paths in `pkd-core` are becoming a bottleneck. To maintain sub-100ms response times for large-scale "Ghost Link" hydration and validation, we need to transition from a single-threaded synchronous model to a parallelized JIT (Just-In-Time) execution model.

## Decision
We will implement a parallelized JIT WASM engine within `pkd-core` to handle high-concurrency query dispatching and dynamic dialect loading. 

We are initiating a Three-Option Crucible to evaluate two primary architectural paths:
1. **Option A (Data Parallelism - Rayon)**: Focuses on sharding registry lookups and validation tasks across a thread pool using the Rayon library. This is optimized for high-throughput, compute-bound tasks.
2. **Option B (Task Parallelism - Actor/Tokio)**: Focuses on an asynchronous, message-driven architecture using the Actor model (likely via `tokio` or a lightweight internal implementation). This is optimized for I/O-bound dialect loading and long-running background tasks.
3. **Option C (Hybrid/Surgical - Single Path)**: Reserved for minor optimizations if the parallel paths prove too complex for the current scale.

## Shift-Left Security Analysis
- **Resource Exhaustion**: Implementation MUST include hard sentinels for CPU and Memory usage per JIT instance.
- **Sandboxing**: All loaded WASM dialects MUST be executed in isolated environments with restricted access to the host memory.
- **Race Conditions**: Utilization of `DashMap` and atomic counters is mandatory to ensure thread safety in the shared registry.
- **Timing Attacks**: Parallel sharding must be audited for side-channel leaks during query execution.

## Rationale
Parallelization is necessary to achieve "AEC Real-Time" performance as the metadata complexity grows. Rayon provides a low-boilerplate path for data-parallel tasks, while the Actor model provides better isolation and fault tolerance for dynamic loading.

## Impact
- **Performance**: Significant reduction in latency for batch operations.
- **Complexity**: Increased complexity in state management and testing.
- **Dependency**: Introduction of `rayon` or `tokio` to the core engine.
