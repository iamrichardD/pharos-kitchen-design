/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Policy
 * File: policy.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Implement BoundaryGuard and LocalDiskVfs with directory-traversal jail.
 * Traceability: Issue #204, ADR-0056, ADR-0057
 * Last Updated: 2026-06-10
 * ======================================================================== */

use std::fs;
use std::path::{Path, PathBuf};

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

pub trait PolicyGuard {
    fn evaluate(&self, context: &PolicyContext) -> PolicyDecision;
}

pub trait Vfs {
    fn read(&self, path: &str) -> Result<Vec<u8>, String>;
    fn exists(&self, path: &str) -> bool;
}

/// BoundaryGuard: Implements prefix-based filtering for multi-org isolation.
pub struct BoundaryGuard {
    pub allowed_prefix: String,
}

impl BoundaryGuard {
    pub fn new(prefix: &str) -> Self {
        Self { allowed_prefix: prefix.to_string() }
    }
}

impl PolicyGuard for BoundaryGuard {
    fn evaluate(&self, context: &PolicyContext) -> PolicyDecision {
        if context.resource_id.starts_with(&self.allowed_prefix) {
            PolicyDecision::Allow
        } else {
            PolicyDecision::Deny {
                reason: format!("Access denied: resource '{}' outside allowed boundary '{}'", 
                        context.resource_id, self.allowed_prefix),
            }
        }
    }
}

/// LocalDiskVfs: Provides secure, jailed file access for the core engine.
pub struct LocalDiskVfs {
    root: PathBuf,
}

impl LocalDiskVfs {
    pub fn new<P: AsRef<Path>>(root: P) -> Self {
        Self { root: root.as_ref().to_path_buf() }
    }

    fn secure_path(&self, path: &str) -> Result<PathBuf, String> {
        let joined = self.root.join(path);
        if joined.starts_with(&self.root) {
            Ok(joined)
        } else {
            Err("Security Violation: Directory traversal attempt detected".to_string())
        }
    }
}

impl Vfs for LocalDiskVfs {
    fn read(&self, path: &str) -> Result<Vec<u8>, String> {
        let safe_path = self.secure_path(path)?;
        fs::read(safe_path).map_err(|e| e.to_string())
    }

    fn exists(&self, path: &str) -> bool {
        self.secure_path(path).map(|p| p.exists()).unwrap_or(false)
    }
}
