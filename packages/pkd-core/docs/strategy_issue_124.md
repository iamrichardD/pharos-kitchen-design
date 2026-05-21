# Strategy for Issue #124: Ghost-Link Integration with LazyShardLoader

## Task Overview
Integrate the dynamic JIT data plane (LazyShardLoader) with the Ghost-Link metadata retrieval engine.

## Implementation Options (ADR-0017)

### Option A: Mutex-Guarded Unified State
Wrap the entire `PharosRegistryHandle` state (Cache, Loader, LRU Queue, Manifest) in a single `std::sync::RwLock`.
- **Pros:** Simple consistency model; easy to implement LRU eviction.
- **Cons:** High contention on the lock during concurrent Ghost-Link hydration calls. 

### Option B: DashMap + Atomic LRU Sentinel (The Winner)
Utilize `DashMap` for the SKU cache to ensure high-throughput reads. Use a separate `Mutex<VecDeque<String>>` to track loaded Shard IDs for LRU eviction. Approximate memory tracking via `AtomicU64`.
- **Pros:** Minimal contention for cache hits; surgical locking only during shard loading/eviction. 
- **Cons:** Slightly more complex coordination between SKU cache and Shard LRU.

### Option C: Lock-Free Shard Management
Implement a fully lock-free LRU and Shard manifest using specialized concurrent structures.
- **Pros:** Maximum possible throughput.
- **Cons:** High architectural complexity; introduces risk of subtle race conditions in the "thermal sentinel" logic.

## Brutally Honest Evaluation
Option A is too slow for the high-volume hydration required by Revit Ghost-Links. Option C is over-engineered for the current requirements and risks stability. Option B provides the best balance of performance and maintainability, ensuring that cache hits (the common case) are non-blocking.

## Selected Winner: Option B
