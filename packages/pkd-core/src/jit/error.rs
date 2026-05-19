/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / JIT / Error
 * File: error.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Centralized error handling for the JIT engine.
 * Traceability: Issue #111, ADR-0036
 * ======================================================================== */

use thiserror::Error;

/// Error types for the Pharos JIT Engine.
/// Why: Provides distinct, actionable error variants for BIM hydration failures.
#[derive(Debug, Error)]
pub enum JitError {
    #[error("JIT Engine initialization failed: {0}")]
    EngineInitialization(String),

    #[error("WASM module '{0}' not found in registry")]
    ModuleNotFound(String),

    #[error("Compilation failed for module '{0}': {1}")]
    CompilationFailed(String, String),

    #[error("Instantiation failed for module '{0}': {1}")]
    InstantiationFailed(String, String),

    #[error("Function '{0}' not found in module '{1}'")]
    FunctionNotFound(String, String),

    #[error("Execution timed out after {0}ms (Temporal Warden)")]
    ExecutionTimeout(u64),

    #[error("Execution error in '{0}::{1}': {2}")]
    ExecutionError(String, String, String),

    #[error("Communication error between actor and handle: {0}")]
    CommunicationError(String),

    #[error("Registry error: {0}")]
    RegistryError(String),
}

/// Specialized Result type for JIT operations.
pub type JitResult<T> = std::result::Result<T, JitError>;
