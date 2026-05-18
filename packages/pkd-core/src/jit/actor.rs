/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / JIT Actor
 * File: actor.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Parallelized JIT WASM Engine using the Actor model (Tokio).
 * Traceability: Issue #111, ADR-0036
 * ======================================================================== */

use anyhow::{Result, anyhow, Context};
use tokio::sync::{mpsc, oneshot};
use wasmtime::*;
use std::time::Duration;

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
        respond_to: oneshot::Sender<Result<()>>,
    },
    /// Execute a function in a loaded module.
    Execute {
        id: String,
        function_name: String,
        params: Vec<Val>,
        respond_to: oneshot::Sender<Result<Vec<Val>>>,
    },
}

/// The JIT Actor managing WASM execution.
pub struct JitActor {
    engine: Engine,
    modules: dashmap::DashMap<String, Module>,
    receiver: mpsc::Receiver<JitActorRequest>,
}

impl JitActor {
    pub fn new(receiver: mpsc::Receiver<JitActorRequest>) -> Result<Self> {
        let mut config = Config::new();
        config.static_memory_maximum_size(MAX_WASM_MEMORY as u64);
        
        // Fail-Fast: Enable Epoch-based interruption for temporal safety.
        config.epoch_interruption(true);
        
        let engine = Engine::new(&config)
            .context("Failed to create Wasmtime Engine with memory limits")?;
            
        // Spawn the Temporal Warden's heartbeat thread.
        // It increments the engine's epoch every 10ms.
        let engine_clone = engine.clone();
        std::thread::spawn(move || loop {
            std::thread::sleep(Duration::from_millis(10));
            engine_clone.increment_epoch();
        });

        Ok(Self {
            engine,
            modules: dashmap::DashMap::new(),
            receiver,
        })
    }

    pub async fn run(mut self) {
        while let Some(request) = self.receiver.recv().await {
            match request {
                JitActorRequest::Load { id, wasm_bytes, respond_to } => {
                    let res = self.handle_load(id, wasm_bytes);
                    let _ = respond_to.send(res);
                }
                JitActorRequest::Execute { id, function_name, params, respond_to } => {
                    let res = self.handle_execute(id, function_name, params);
                    let _ = respond_to.send(res);
                }
            }
        }
    }

    fn handle_load(&self, id: String, wasm_bytes: Vec<u8>) -> Result<()> {
        let module = Module::new(&self.engine, wasm_bytes)
            .map_err(|e| anyhow!("Failed to compile WASM module '{}': {}", id, e))?;
        self.modules.insert(id, module);
        Ok(())
    }

    fn handle_execute(&self, id: String, function_name: String, params: Vec<Val>) -> Result<Vec<Val>> {
        let module = self.modules.get(&id)
            .ok_or_else(|| anyhow!("WASM module '{}' not loaded", id))?;
            
        let mut store = Store::new(&self.engine, ());
        
        // Enforce the Temporal Warden sentinel (100ms timeout).
        // Since heartbeat is 10ms, a deadline of 10 epochs = 100ms.
        store.set_epoch_deadline(10);
        
        let linker = Linker::new(&self.engine);
        let instance = linker.instantiate(&mut store, &module)
            .context("Failed to instantiate WASM module")?;
            
        let func = instance.get_func(&mut store, &function_name)
            .ok_or_else(|| anyhow!("Function '{}' not found in module '{}'", function_name, id))?;
            
        let mut results = vec![Val::I32(0); func.ty(&store).results().len()];
        func.call(&mut store, &params, &mut results)
            .map_err(|e| {
                let is_timeout = format!("{:?}", e).contains("interrupt") || format!("{:?}", e).contains("timeout");
                if is_timeout {
                    anyhow!("Execution timed out after {}ms (Temporal Warden)", WASM_EXECUTION_TIMEOUT_MS)
                } else {
                    anyhow!("Execution error in '{}::{}': {}", id, function_name, e)
                }
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

    pub async fn load(&self, id: String, wasm_bytes: Vec<u8>) -> Result<()> {
        let (respond_to, receiver) = oneshot::channel();
        self.sender.send(JitActorRequest::Load { id, wasm_bytes, respond_to }).await
            .map_err(|_| anyhow!("Failed to send Load request to JitActor"))?;
        receiver.await.context("JitActor dropped Load response channel")?
    }

    pub async fn execute(&self, id: String, function_name: String, params: Vec<Val>) -> Result<Vec<Val>> {
        let (respond_to, receiver) = oneshot::channel();
        self.sender.send(JitActorRequest::Execute { id, function_name, params, respond_to }).await
            .map_err(|_| anyhow!("Failed to send Execute request to JitActor"))?;
        receiver.await.context("JitActor dropped Execute response channel")?
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_should_load_wasm_within_memory_limits_when_requested() {
        let (handle, actor) = JitHandle::new();
        tokio::spawn(async move { actor.run().await });

        let wasm_bytes = wat::parse_str("(module)").unwrap();
        let res = handle.load("test_module".to_string(), wasm_bytes).await;
        assert!(res.is_ok(), "Expected valid WASM load to succeed");
    }

    #[tokio::test]
    async fn test_should_fail_fast_on_invalid_wasm_payload() {
        let (handle, actor) = JitHandle::new();
        tokio::spawn(async move { actor.run().await });

        let invalid_bytes = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0xff];
        let res = handle.load("invalid_module".to_string(), invalid_bytes).await;
        assert!(res.is_err(), "Expected invalid WASM load to fail");
    }

    #[tokio::test]
    async fn test_should_terminate_execution_when_timeout_exceeded() {
        let (handle, actor) = JitHandle::new();
        tokio::spawn(async move { actor.run().await });

        // Infinite loop WASM module
        let wat = r#"
            (module
                (func (export "infinite_loop")
                    loop
                        br 0
                    end
                )
            )
        "#;
        let wasm_bytes = wat::parse_str(wat).unwrap();
        handle.load("timeout_module".to_string(), wasm_bytes).await.expect("Failed to load module");

        let res = handle.execute("timeout_module".to_string(), "infinite_loop".to_string(), vec![]).await;
        
        assert!(res.is_err(), "Expected execution to fail due to timeout");
        assert!(res.unwrap_err().to_string().contains("timed out"), "Error message should mention timeout");
    }
}
