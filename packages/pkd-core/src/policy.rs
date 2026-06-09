/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Policy
 * File: policy.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Define the 'Informed Sentinel' and VFS contracts for Multi-Org filtering.
 * Traceability: Issue #204, ADR-0056, ADR-0057
 * Last Updated: 2026-06-09
 * ======================================================================== */

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PolicyDecision {
    Allow,
    Deny { reason: String },
    Challenge { factor: String }, 
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyContext {
    pub organization_id: String,
    pub user_id: String,
    pub resource_id: String,
    pub action: String,
}

/// The 'Informed Sentinel' contract for Multi-Org filtering.
/// Why: Decouples the security evaluation logic from the execution engine.
pub trait PolicyGuard {
    fn evaluate(&self, context: &PolicyContext) -> PolicyDecision;
}

/// Virtual File System trait for zero-host WASM execution.
/// Why: Provides cross-platform file access parity (ADR-0014).
pub trait Vfs {
    fn read(&self, path: &str) -> Result<Vec<u8>, String>;
    fn exists(&self, path: &str) -> bool;
}
