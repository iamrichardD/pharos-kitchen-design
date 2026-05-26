/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / JIT Actor
 * File: actor.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Parallelized JIT WASM Engine using the Actor model (Tokio).
 * Traceability: Issue #111, ADR-0036
 * ======================================================================== */

use crate::jit::{JitError, JitResult};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot};
use wasmtime::*;

/// Memory limit for JIT WASM instances (64MB default).
pub const MAX_WASM_MEMORY: usize = 64 * 1024 * 1024;

/// Execution timeout for WASM modules (100ms mandate).
/// Why: Prevents pathological or malicious WASM from blocking the actor (Temporal Warden).
pub const WASM_EXECUTION_TIMEOUT_MS: u64 = 100;

/// Requests handled by the JIT Actor.
#[derive(Debug)]
pub enum JitActorRequest {
    /// Load a WASM module from bytes.
    Load {
        id: String,
        wasm_bytes: Vec<u8>,
        respond_to: oneshot::Sender<JitResult<()>>,
    },
    /// Execute a function in a loaded module.
    Execute {
        id: String,
        function_name: String,
        params: Vec<Val>,
        respond_to: oneshot::Sender<JitResult<Vec<Val>>>,
    },
    /// Gracefully shutdown the actor and its warden.
    Shutdown,
}

/// The JIT Actor managing WASM execution.
pub struct JitActor {
    engine: Engine,
    modules: dashmap::DashMap<String, Module>,
    receiver: mpsc::Receiver<JitActorRequest>,
    shutdown_signal: Arc<AtomicBool>,
}

impl JitActor {
    pub fn new(receiver: mpsc::Receiver<JitActorRequest>) -> JitResult<Self> {
        let mut config = Config::new();
        // Fail-Fast: Explicitly limit linear memory at the engine level.
        config.static_memory_maximum_size(MAX_WASM_MEMORY as u64);

        // Fail-Fast: Enable Epoch-based interruption for temporal safety.
        config.epoch_interruption(true);

        let engine = Engine::new(&config).map_err(|e| {
            JitError::EngineInitialization(format!(
                "Failed to create Wasmtime Engine with memory limits: {}",
                e
            ))
        })?;

        let shutdown_signal = Arc::new(AtomicBool::new(false));
        let shutdown_clone = Arc::clone(&shutdown_signal);

        // Spawn the Temporal Warden's heartbeat thread.
        // It increments the engine's epoch every 10ms.
        let engine_clone = engine.clone();
        std::thread::spawn(move || loop {
            if shutdown_clone.load(Ordering::Relaxed) {
                break;
            }
            std::thread::sleep(Duration::from_millis(10));
            engine_clone.increment_epoch();
        });

        Ok(Self {
            engine,
            modules: dashmap::DashMap::new(),
            receiver,
            shutdown_signal,
        })
    }

    pub async fn run(mut self) {
        while let Some(request) = self.receiver.recv().await {
            match request {
                JitActorRequest::Load {
                    id,
                    wasm_bytes,
                    respond_to,
                } => {
                    let res = self.handle_load(id, wasm_bytes);
                    let _ = respond_to.send(res);
                }
                JitActorRequest::Execute {
                    id,
                    function_name,
                    params,
                    respond_to,
                } => {
                    let res = self.handle_execute(id, function_name, params);
                    let _ = respond_to.send(res);
                }
                JitActorRequest::Shutdown => {
                    self.shutdown_signal.store(true, Ordering::Relaxed);
                    break;
                }
            }
        }
    }

    fn handle_load(&self, id: String, wasm_bytes: Vec<u8>) -> JitResult<()> {
        let module = Module::new(&self.engine, wasm_bytes)
            .map_err(|e| JitError::CompilationFailed(id.clone(), e.to_string()))?;
        self.modules.insert(id, module);
        Ok(())
    }

    fn handle_execute(
        &self,
        id: String,
        function_name: String,
        params: Vec<Val>,
    ) -> JitResult<Vec<Val>> {
        // Harden: Clone the module out of DashMap to release the sharded lock immediately.
        // This ensures lock-free concurrent lookups while other executions are in progress.
        let module = self
            .modules
            .get(&id)
            .map(|m| m.clone())
            .ok_or_else(|| JitError::ModuleNotFound(id.clone()))?;

        // Enforce strict resource limits via StoreLimits.
        let mut store = Store::new(
            &self.engine,
            StoreLimitsBuilder::new()
                .memory_size(MAX_WASM_MEMORY)
                .instances(1)
                .build(),
        );
        store.limiter(|s| s);

        // Enforce the Temporal Warden sentinel (100ms timeout).
        // Since heartbeat is 10ms, a deadline of 10 epochs = 100ms.
        store.set_epoch_deadline(10);

        let linker = Linker::new(&self.engine);
        let instance = linker
            .instantiate(&mut store, &module)
            .map_err(|e| JitError::InstantiationFailed(id.clone(), e.to_string()))?;

        let func = instance
            .get_func(&mut store, &function_name)
            .ok_or_else(|| JitError::FunctionNotFound(function_name.clone(), id.clone()))?;

        let mut results = vec![Val::I32(0); func.ty(&store).results().len()];
        func.call(&mut store, &params, &mut results).map_err(|e| {
            // Robust detection of Temporal Warden interruption via Epoch deadline.
            if let Some(trap) = e.downcast_ref::<Trap>() {
                if *trap == Trap::Interrupt {
                    return JitError::ExecutionTimeout(WASM_EXECUTION_TIMEOUT_MS);
                }
            }

            // Fallback for general execution errors.
            JitError::ExecutionError(id.clone(), function_name.clone(), e.to_string())
        })?;

        Ok(results)
    }
}

/// Handle for communicating with the JitActor.
#[derive(Clone)]
pub struct JitHandle {
    sender: mpsc::Sender<JitActorRequest>,
}

impl JitHandle {
    pub fn new() -> (Self, JitActor) {
        let (sender, receiver) = mpsc::channel(32);
        let actor = JitActor::new(receiver).expect("Failed to initialize JitActor");
        (Self { sender }, actor)
    }

    pub async fn load(&self, id: String, wasm_bytes: Vec<u8>) -> JitResult<()> {
        let (respond_to, receiver) = oneshot::channel();
        self.sender
            .send(JitActorRequest::Load {
                id,
                wasm_bytes,
                respond_to,
            })
            .await
            .map_err(|_| {
                JitError::CommunicationError("Failed to send Load request to JitActor".to_string())
            })?;
        receiver.await.map_err(|_| {
            JitError::CommunicationError("JitActor dropped Load response channel".to_string())
        })?
    }

    pub async fn execute(
        &self,
        id: String,
        function_name: String,
        params: Vec<Val>,
    ) -> JitResult<Vec<Val>> {
        let (respond_to, receiver) = oneshot::channel();
        self.sender
            .send(JitActorRequest::Execute {
                id,
                function_name,
                params,
                respond_to,
            })
            .await
            .map_err(|_| {
                JitError::CommunicationError(
                    "Failed to send Execute request to JitActor".to_string(),
                )
            })?;
        receiver.await.map_err(|_| {
            JitError::CommunicationError("JitActor dropped Execute response channel".to_string())
        })?
    }

    pub async fn shutdown(&self) -> JitResult<()> {
        self.sender
            .send(JitActorRequest::Shutdown)
            .await
            .map_err(|_| {
                JitError::CommunicationError(
                    "Failed to send Shutdown request to JitActor".to_string(),
                )
            })
    }
}
