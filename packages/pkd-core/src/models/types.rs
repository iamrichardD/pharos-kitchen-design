/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Types
 * File: types.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Strongly typed enums for PKD-standardized parameter values.
 * Traceability: Issue #9, ADR 0002, ADR 0024
 * ======================================================================== */

use serde::{Deserialize, Serialize};

// Re-export ParameterValue from the shared pharos-protocol (ADR 0024)
// Why: Enforces Metadata-First Truth across all Pharos-compatible engines.
pub use pharos_protocol::metadata::ParameterValue;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct DocLink {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct AssetViews {
    pub front: Option<String>,
    pub plan: Option<String>,
    pub side: Option<String>,
    #[serde(rename = "3d")]
    pub view_3d: Option<String>,
}
