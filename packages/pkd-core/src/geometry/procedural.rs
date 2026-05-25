/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Geometry
 * File: procedural.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Procedural geometry generator service for parametric BIM.
 * Traceability: Issue #122, Audit-Remediation
 * ======================================================================== */

use crate::models::metadata::{PharosMetadata, GeometryManifest, GeometryOperation, OperationDimensions};
use crate::models::types::ParameterValue;

/// Standard numerical tolerance for BIM geometric operations.
/// Why: Floating point comparisons in AEC software must be epsilon-guarded 
/// to ensure stability across Revit/FFI boundaries.
pub const GEOMETRY_TOLERANCE: f64 = 1e-6;

/// Service for generating procedural BIM geometry from parametric inputs.
/// 
/// Why: Encapsulates the logic of "Baking" geometry, adhering to SRP by 
/// separating the data model (PharosMetadata) from procedural generation logic.
pub struct ProceduralGenerator;

impl ProceduralGenerator {
    /// Generates a GeometryManifest based on the provided metadata.
    /// 
    /// This implementation supports 'Extrusion' operations and is extensible
    /// for future 'Sweep' and 'Revolve' variants (Phase 5).
    pub fn generate_manifest(metadata: &PharosMetadata) -> Option<GeometryManifest> {
        if !metadata.performance_metadata.procedural_lod_enabled {
            return None;
        }

        // Why: Prefer explicit PKD-prefixed parameters for dimensional authority.
        let width = Self::get_numeric_param(metadata, "WIDTH")?;
        let depth = Self::get_numeric_param(metadata, "DEPTH")?;
        let height = Self::get_numeric_param(metadata, "HEIGHT")?;

        // Fail-Fast: Numerical stability check via epsilon-guarded tolerance.
        if width < GEOMETRY_TOLERANCE || depth < GEOMETRY_TOLERANCE || height < GEOMETRY_TOLERANCE {
            return None; 
        }

        Some(GeometryManifest {
            lod: 200,
            operations: vec![GeometryOperation {
                id: "main_chassis".to_string(),
                operation_type: "Extrusion".to_string(),
                profile: "Rectangle".to_string(),
                dimensions: OperationDimensions {
                    width,
                    depth,
                    height,
                },
                origin: [0.0, 0.0, 0.0],
                material_class: "Stainless_Steel".to_string(),
            }],
        })
    }

    /// Helper to extract numeric values from ParameterValue.
    /// Supports both direct Number and sanitized Text (e.g., "24\"").
    fn get_numeric_param(metadata: &PharosMetadata, key: &str) -> Option<f64> {
        let pkd_key = format!("PKD_{}", key);
        
        metadata.parameters.get(&pkd_key)
            .or_else(|| metadata.parameters.get(key))
            .and_then(|val| match val {
                ParameterValue::Number(n) => Some(*n),
                ParameterValue::Text(s) => {
                    // Basic AEC-standard dimension sanitization
                    s.replace("\"", "").parse::<f64>().ok()
                },
                _ => None,
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::metadata::{Classification, PerformanceMetadata};
    use std::collections::BTreeMap;

    fn create_test_metadata() -> PharosMetadata {
        PharosMetadata {
            metadata_id: "TEST-001".to_string(),
            name: "Test Product".to_string(),
            schema_version: "1.0.0".to_string(),
            classification: Classification {
                omniclass_table_23: "23-00".to_string(),
                category: "Test".to_string(),
            },
            parameters: BTreeMap::new(),
            lod_geometry_specs: BTreeMap::new(),
            geometry_manifest: None,
            performance_metadata: PerformanceMetadata {
                estimated_rfa_size_kb: 10,
                procedural_lod_enabled: true,
                ghost_link_active: true,
            },
        }
    }

    #[test]
    fn test_should_generate_extrusion_when_dimensions_valid() {
        let mut metadata = create_test_metadata();
        metadata.parameters.insert("PKD_WIDTH".to_string(), ParameterValue::Number(24.0));
        metadata.parameters.insert("PKD_DEPTH".to_string(), ParameterValue::Number(24.0));
        metadata.parameters.insert("PKD_HEIGHT".to_string(), ParameterValue::Number(34.0));

        let manifest = ProceduralGenerator::generate_manifest(&metadata).expect("Should generate manifest");
        
        assert_eq!(manifest.operations.len(), 1);
        assert_eq!(manifest.operations[0].dimensions.width, 24.0);
        assert_eq!(manifest.operations[0].operation_type, "Extrusion");
    }

    #[test]
    fn test_should_return_none_when_dimensions_below_tolerance() {
        let mut metadata = create_test_metadata();
        metadata.parameters.insert("PKD_WIDTH".to_string(), ParameterValue::Number(0.0000001));
        metadata.parameters.insert("PKD_DEPTH".to_string(), ParameterValue::Number(24.0));
        metadata.parameters.insert("PKD_HEIGHT".to_string(), ParameterValue::Number(34.0));

        let manifest = ProceduralGenerator::generate_manifest(&metadata);
        assert!(manifest.is_none());
    }

    #[test]
    fn test_should_return_none_when_procedural_lod_disabled() {
        let mut metadata = create_test_metadata();
        metadata.performance_metadata.procedural_lod_enabled = false;
        metadata.parameters.insert("PKD_WIDTH".to_string(), ParameterValue::Number(24.0));

        let manifest = ProceduralGenerator::generate_manifest(&metadata);
        assert!(manifest.is_none());
    }
}
