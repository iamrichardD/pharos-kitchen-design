/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Models
 * File: metadata.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Product metadata model for PKD assets.
 * Traceability: Issue #9, ADR 0002, Issue #124
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub geometry_manifest: Option<GeometryManifest>,
    pub performance_metadata: PerformanceMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct GeometryManifest {
    pub lod: u32,
    pub operations: Vec<GeometryOperation>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct GeometryOperation {
    pub id: String,
    #[serde(rename = "type")]
    pub operation_type: String,
    pub profile: String,
    pub dimensions: OperationDimensions,
    pub origin: [f64; 3],
    pub material_class: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct OperationDimensions {
    pub width: f64,
    pub depth: f64,
    pub height: f64,
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

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RegistryShard {
    pub shard_id: String,
    pub v: String,
    pub records: BTreeMap<String, PharosMetadata>,
}
