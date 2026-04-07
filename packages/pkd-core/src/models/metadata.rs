/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Models
 * File: metadata.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Product metadata model for PKD assets.
 * Traceability: Issue #9, ADR 0002
 * ======================================================================== */

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use crate::models::types::ParameterValue;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct PharosMetadata {
    pub metadata_id: String,
    pub name: String,
    pub schema_version: String,
    pub classification: Classification,
    pub parameters: BTreeMap<String, ParameterValue>,
    pub lod_geometry_specs: BTreeMap<String, LodGeometrySpec>,
    pub performance_metadata: PerformanceMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Classification {
    pub omniclass_table_23: String,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct LodGeometrySpec {
    #[serde(rename = "type")]
    pub spec_type: String,
    pub dimensions: Option<BTreeMap<String, String>>,
    pub components: Option<Vec<String>>,
    pub features: Option<Vec<String>>,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct PerformanceMetadata {
    pub estimated_rfa_size_kb: u32,
    pub procedural_lod_enabled: bool,
    pub ghost_link_active: bool,
}
