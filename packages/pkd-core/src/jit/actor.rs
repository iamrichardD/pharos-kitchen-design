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

/// Memory limit for JIT WASM instances (64MB default).
pub const MAX_WASM_MEMORY: usize = 64 * 1024 * 1024;

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
        
        let engine = Engine::new(&config)
            .context("Failed to create Wasmtime Engine with memory limits")?;
            
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
        let linker = Linker::new(&self.engine);
        let instance = linker.instantiate(&mut store, &module)
            .context("Failed to instantiate WASM module")?;
            
        let func = instance.get_func(&mut store, &function_name)
            .ok_or_else(|| anyhow!("Function '{}' not found in module '{}'", function_name, id))?;
            
        let mut results = vec![Val::I32(0); func.ty(&store).results().len()];
        func.call(&mut store, &params, &mut results)
            .map_err(|e| anyhow!("Execution error in '{}::{}': {}", id, function_name, e))?;
            
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
}
