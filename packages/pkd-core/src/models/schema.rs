/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Models
 * File: schema.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Rust representation of the Pharos Metadata Schema (Single Source of Truth).
 * Traceability: Issue #9, ADR 0002
 * ======================================================================== */

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct PharosSchema {
    pub version: String,
    pub lod_definitions: BTreeMap<String, LodDefinition>,
    pub parameter_standards: ParameterStandards,
    pub bloat_rules: BloatRules,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct LodDefinition {
    pub name: String,
    pub geometry: String,
    pub purpose: String,
    pub max_complexity: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct ParameterStandards {
    pub classification: String,
    pub shared_parameters: BTreeMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct BloatRules {
    pub max_file_size_delta_kb: u32,
    pub forbidden_metadata: Vec<String>,
    pub regional_stripping_rules: BTreeMap<String, Vec<String>>,
}
