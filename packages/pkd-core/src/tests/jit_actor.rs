/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Tests / JIT Actor
 * File: jit_actor.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic tests for the Actor-based JIT engine.
 * Traceability: Issue #111, ADR-0036
 * ======================================================================== */

use crate::jit_actor::{JitHandle, JitActor};
use wasmtime::Val;
use tokio::time::{sleep, Duration};

#[tokio::test]
async fn test_should_dispatch_parallel_lookups_when_multiple_requests_received() {
    let (handle, actor) = JitHandle::new();
    tokio::spawn(async move { actor.run().await });

    // Load a module that has a simple function
    let wasm_bytes = wat::parse_str(r#"
        (module
            (func (export "add") (param i32 i32) (result i32)
                local.get 0
                local.get 1
                i32.add)
        )
    "#).unwrap();

    handle.load("adder".to_string(), wasm_bytes).await.expect("Failed to load");

    // Spawn multiple concurrent execution requests
    let mut futures = Vec::new();
    for i in 0..10 {
        let h = handle.clone();
        futures.push(tokio::spawn(async move {
            h.execute("adder".to_string(), "add".to_string(), vec![Val::I32(i), Val::I32(1)]).await
        }));
    }

    for (i, f) in futures.into_iter().enumerate() {
        let res = f.await.unwrap().unwrap();
        assert_eq!(res[0].i32(), Some(i as i32 + 1));
    }
}

#[tokio::test]
async fn test_should_fail_fast_when_module_not_found() {
    let (handle, actor) = JitHandle::new();
    tokio::spawn(async move { actor.run().await });

    let res = handle.execute("non_existent".to_string(), "any".to_string(), vec![]).await;
    assert!(res.is_err());
    assert!(res.unwrap_err().to_string().contains("WASM module 'non_existent' not loaded"));
}

#[tokio::test]
async fn test_should_handle_actor_termination_gracefully() {
    let (handle, actor) = JitHandle::new();
    let join_handle = tokio::spawn(async move { actor.run().await });

    // Drop the actor task (simulating a crash or termination)
    join_handle.abort();
    
    // Wait a bit for the task to be aborted
    sleep(Duration::from_millis(10)).await;

    let wasm_bytes = wat::parse_str("(module)").unwrap();
    let res = handle.load("test".to_string(), wasm_bytes).await;
    
    assert!(res.is_err(), "Expected error when actor is terminated");
    assert!(res.unwrap_err().to_string().contains("Failed to send Load request") || 
            res.unwrap_err().to_string().contains("JitActor dropped"));
}
