/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Slices / Warewashing
 * File: models.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Data models for Warewashing equipment (Dishwashers, Scullery).
 * Traceability: Priority 4, Issue #30
 * ======================================================================== */

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WarewashingParameters {
    #[serde(rename = "PKD_Manufacturer")]
    pub manufacturer: String,
    #[serde(rename = "PKD_ModelNumber")]
    pub model_number: String,
    #[serde(rename = "PKD_Voltage")]
    pub voltage: Option<String>,
    #[serde(rename = "PKD_Phase")]
    pub phase: Option<i32>,
    #[serde(rename = "PKD_Wattage")]
    pub wattage: Option<String>,
    #[serde(rename = "PKD_DrainConnection")]
    pub drain_connection: Option<String>,
    #[serde(rename = "PKD_MainCategory")]
    pub main_category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WarewashingMetadata {
    pub metadata_id: String,
    pub name: String,
    pub parameters: WarewashingParameters,
}
