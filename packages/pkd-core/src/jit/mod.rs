/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / JIT
 * File: mod.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified JIT WASM Engine vertical slice with parallel dispatch.
 * Traceability: Issue #111, ADR-0036
 * ======================================================================== */

pub mod actor;
pub mod error;

use crate::models::metadata::PharosMetadata;
use dashmap::DashMap;
use rayon::prelude::*;
use std::sync::Arc;
use wasmtime::*;

pub use actor::{JitActor, JitActorRequest, JitHandle, MAX_WASM_MEMORY};
pub use error::{JitError, JitResult};

/// Configures and loads WASM modules for JIT execution.
/// Why: Enforces strict memory limits to prevent host resource exhaustion during dynamic execution.
pub struct WasmJitLoader {
    engine: Engine,
    max_memory_pages: u64,
}

impl WasmJitLoader {
    /// Creates a new JIT loader with a specified memory limit.
    /// If no limit is provided, it defaults to the MAX_WASM_MEMORY sentinel (64MB).
    pub fn new(max_memory_bytes: Option<usize>) -> JitResult<Self> {
        let limit = max_memory_bytes.unwrap_or(MAX_WASM_MEMORY);

        let mut config = Config::new();
        config.strategy(Strategy::Cranelift);
        config.parallel_compilation(true);

        // Fail-Fast: Explicitly limit the maximum size of static linear memory.
        // WASM pages are 64KiB.
        let max_memory_pages = (limit as u64) / (64 * 1024);
        config.static_memory_maximum_size(limit as u64);

        let engine =
            Engine::new(&config).map_err(|e| JitError::EngineInitialization(e.to_string()))?;

        Ok(Self {
            engine,
            max_memory_pages,
        })
    }

    /// Compiles a WASM module from bytes.
    pub fn compile_module(&self, wasm_bytes: &[u8]) -> JitResult<Module> {
        Module::new(&self.engine, wasm_bytes)
            .map_err(|e| JitError::CompilationFailed("anonymous".to_string(), e.to_string()))
    }

    /// Returns the configured memory limit in pages.
    pub fn max_memory_pages(&self) -> u64 {
        self.max_memory_pages
    }
}

/// Dispatches metadata queries across multiple threads using Rayon.
/// Why: Maximizes throughput for large-scale BIM hydration tasks by sharding DashMap lookups.
pub struct ParallelQueryDispatcher {
    registry: Arc<DashMap<String, PharosMetadata>>,
}

impl ParallelQueryDispatcher {
    pub fn new(registry: Arc<DashMap<String, PharosMetadata>>) -> Self {
        Self { registry }
    }

    /// Executes a filter/map operation across the registry in parallel.
    /// Uses DashMap's native par_iter for lock-free sharded concurrency.
    pub fn query_parallel<F, R>(&self, predicate: F) -> Vec<R>
    where
        F: Fn((&String, &PharosMetadata)) -> Option<R> + Sync + Send,
        R: Send,
    {
        self.registry
            .par_iter()
            .filter_map(|item| {
                let (id, metadata) = item.pair();
                predicate((id, metadata))
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::metadata::{Classification, PerformanceMetadata, PharosMetadata};
    use std::collections::BTreeMap;

    fn create_mock_metadata(id: String) -> PharosMetadata {
        PharosMetadata {
            metadata_id: id.clone(),
            name: format!("Mock {}", id),
            schema_version: "1.0.0".to_string(),
            classification: Classification {
                omniclass_table_23: "23-00 00 00".to_string(),
                category: "Mock".to_string(),
            },
            parameters: BTreeMap::new(),
            lod_geometry_specs: BTreeMap::new(),
            geometry_manifest: None,
            performance_metadata: PerformanceMetadata {
                estimated_rfa_size_kb: 100,
                procedural_lod_enabled: false,
                ghost_link_active: false,
            },
        }
    }

    #[test]
    fn test_should_initialize_jit_loader_with_memory_limits() {
        // Test with default sentinel (64MB)
        let loader = WasmJitLoader::new(None).expect("Failed to create JIT loader");
        assert_eq!(loader.max_memory_pages(), 1024); // 64 MiB = 1024 pages

        // Test with explicit 128MB
        let loader_128 =
            WasmJitLoader::new(Some(128 * 1024 * 1024)).expect("Failed to create JIT loader");
        assert_eq!(loader_128.max_memory_pages(), 2048);
    }

    #[test]
    fn test_should_dispatch_queries_in_parallel_when_registry_is_large() {
        let registry = Arc::new(DashMap::new());
        for i in 0..1000 {
            let id = format!("PHX-{:04}", i);
            registry.insert(id.clone(), create_mock_metadata(id));
        }

        let dispatcher = ParallelQueryDispatcher::new(registry);
        let results: Vec<String> = dispatcher.query_parallel(|(id, _)| {
            if id.contains("55") {
                Some(id.clone())
            } else {
                None
            }
        });

        assert!(results.contains(&"PHX-0055".to_string()));
        assert!(results.contains(&"PHX-0550".to_string()));
    }
}
