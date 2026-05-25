/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Geometry
 * File: extrusion.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Procedural extrusion generator for parametric BIM geometry.
 * Traceability: Issue #122
 * ======================================================================== */

use crate::models::metadata::{PharosMetadata, GeometryManifest, GeometryOperation, OperationDimensions};
use crate::models::types::ParameterValue;

/// Generator for "Extrusion" type geometry operations.
/// 
/// Why: Provides a memory-safe way to generate procedural LOD 200 geometry 
/// from parametric inputs, fulfilling the "Metadata-First Truth" mandate.
pub struct ExtrusionGenerator;

impl ExtrusionGenerator {
    /// Generates a GeometryManifest based on the provided metadata.
    /// 
    /// This implementation currently focuses on a single "main_chassis" extrusion
    /// derived from width, depth, and height parameters.
    pub fn bake(metadata: &PharosMetadata) -> Option<GeometryManifest> {
        if !metadata.performance_metadata.procedural_lod_enabled {
            return None;
        }

        // Why: Prefer explicit PKD-prefixed parameters for dimensional authority.
        let width = Self::get_numeric_param(metadata, "WIDTH")?;
        let depth = Self::get_numeric_param(metadata, "DEPTH")?;
        let height = Self::get_numeric_param(metadata, "HEIGHT")?;

        // Fail-Fast: Ensure positive dimensions to prevent invalid Revit DirectShapes.
        if width <= 0.0 || depth <= 0.0 || height <= 0.0 {
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

        let manifest = ExtrusionGenerator::bake(&metadata).expect("Should generate manifest");
        
        assert_eq!(manifest.operations.len(), 1);
        assert_eq!(manifest.operations[0].dimensions.width, 24.0);
        assert_eq!(manifest.operations[0].operation_type, "Extrusion");
    }

    #[test]
    fn test_should_parse_text_dimensions_when_numeric_missing() {
        let mut metadata = create_test_metadata();
        metadata.parameters.insert("PKD_WIDTH".to_string(), ParameterValue::Text("24\"".to_string()));
        metadata.parameters.insert("PKD_DEPTH".to_string(), ParameterValue::Text("24".to_string()));
        metadata.parameters.insert("PKD_HEIGHT".to_string(), ParameterValue::Number(34.0));

        let manifest = ExtrusionGenerator::bake(&metadata).expect("Should generate manifest");
        assert_eq!(manifest.operations[0].dimensions.width, 24.0);
        assert_eq!(manifest.operations[0].dimensions.depth, 24.0);
    }

    #[test]
    fn test_should_return_none_when_dimensions_negative() {
        let mut metadata = create_test_metadata();
        metadata.parameters.insert("PKD_WIDTH".to_string(), ParameterValue::Number(-1.0));
        metadata.parameters.insert("PKD_DEPTH".to_string(), ParameterValue::Number(24.0));
        metadata.parameters.insert("PKD_HEIGHT".to_string(), ParameterValue::Number(34.0));

        let manifest = ExtrusionGenerator::bake(&metadata);
        assert!(manifest.is_none());
    }

    #[test]
    fn test_should_return_none_when_procedural_lod_disabled() {
        let mut metadata = create_test_metadata();
        metadata.performance_metadata.procedural_lod_enabled = false;
        metadata.parameters.insert("PKD_WIDTH".to_string(), ParameterValue::Number(24.0));

        let manifest = ExtrusionGenerator::bake(&metadata);
        assert!(manifest.is_none());
    }
}
