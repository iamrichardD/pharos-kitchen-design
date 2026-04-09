/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Models
 * File: schema.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Rust representation of the Pharos Metadata Schema (Single Source of Truth).
 * Traceability: Issue #9, ADR 0002, ADR 0023
 * ======================================================================== */

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct PharosSchema {
    pub version: String,
    pub lod_definitions: BTreeMap<String, LodDefinition>,
    pub parameter_standards: ParameterStandards,
    pub bloat_rules: BloatRules,
    pub unit_mapping: BTreeMap<String, BTreeMap<String, String>>,
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
    pub shared_parameters: BTreeMap<String, SharedParameter>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct SharedParameter {
    #[serde(rename = "type")]
    pub param_type: String,
    pub attributes: Vec<String>,
}

impl SharedParameter {
    pub fn is_lookup(&self) -> bool {
        self.attributes.contains(&"Lookup".to_string())
    }

    pub fn is_indexed(&self) -> bool {
        self.attributes.contains(&"Indexed".to_string())
    }

    pub fn is_unique(&self) -> bool {
        self.attributes.contains(&"Unique".to_string())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct BloatRules {
    pub max_file_size_delta_kb: u32,
    pub forbidden_metadata: Vec<String>,
    pub regional_stripping_rules: BTreeMap<String, Vec<String>>,
    pub procedural_preference: bool,
}
