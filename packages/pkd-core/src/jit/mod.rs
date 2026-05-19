/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / JIT
 * File: mod.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified JIT WASM Engine vertical slice.
 * Traceability: Issue #146, ADR-0036
 * ======================================================================== */

pub mod actor;
pub mod error;

use wasmtime::*;
use rayon::prelude::*;
use std::sync::Arc;
use crate::models::metadata::PharosMetadata;
use dashmap::DashMap;

pub use actor::{JitActor, JitHandle, JitActorRequest, MAX_WASM_MEMORY};
pub use error::{JitError, JitResult};

/// Configures and loads WASM modules for JIT execution.
/// Why: Enforces strict memory limits to prevent host resource exhaustion during dynamic execution.
pub struct WasmJitLoader {
    engine: Engine,
    max_memory_pages: u64,
}

impl WasmJitLoader {
    /// Creates a new JIT loader with a specified memory limit in MiB.
    pub fn new(max_memory_mib: u64) -> JitResult<Self> {
        let mut config = Config::new();
        config.strategy(Strategy::Cranelift);
        config.parallel_compilation(true);
        
        // WASM pages are 64KiB. 1 MiB = 16 pages.
        let max_memory_pages = (max_memory_mib * 1024 * 1024) / (64 * 1024);
        config.static_memory_maximum_size(max_memory_mib * 1024 * 1024);

        let engine = Engine::new(&config)
            .map_err(|e| JitError::EngineInitialization(e.to_string()))?;

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

    /// Returns the configured memory limit sentinel.
    pub fn max_memory_pages(&self) -> u64 {
        self.max_memory_pages
    }
}

/// Dispatches metadata queries across multiple threads using Rayon.
/// Why: Maximizes throughput for large-scale BIM hydration tasks.
pub struct ParallelQueryDispatcher {
    registry: Arc<DashMap<String, PharosMetadata>>,
}

impl ParallelQueryDispatcher {
    pub fn new(registry: Arc<DashMap<String, PharosMetadata>>) -> Self {
        Self { registry }
    }

    /// Executes a filter/map operation across the registry in parallel.
    pub fn query_parallel<F, R>(&self, predicate: F) -> Vec<R>
    where
        F: Fn((&String, &PharosMetadata)) -> Option<R> + Sync + Send,
        R: Send,
    {
        self.registry
            .iter()
            .par_bridge()
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
    use crate::models::metadata::{PharosMetadata, Classification, PerformanceMetadata};
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
            performance_metadata: PerformanceMetadata {
                estimated_rfa_size_kb: 100,
                procedural_lod_enabled: false,
                ghost_link_active: false,
            },
        }
    }

    #[test]
    fn test_should_initialize_jit_loader_with_memory_limits() {
        let loader = WasmJitLoader::new(128).expect("Failed to create JIT loader");
        assert_eq!(loader.max_memory_pages(), 2048); // 128 MiB = 2048 pages
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
