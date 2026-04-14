/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Validation
 * File: validator.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: High-rigor validation engine for PKD metadata and LOD compliance.
 * Traceability: Issue #9, ADR 0002
 * ======================================================================== */

use crate::models::schema::PharosSchema;
use crate::models::metadata::PharosMetadata;
use crate::models::types::ParameterValue;
use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug, PartialEq, Serialize)]
#[serde(tag = "code", content = "details")]
pub enum ValidationError {
    #[error("Missing required PKD parameter: {0}")]
    #[serde(rename = "MISSING_PARAMETER")]
    MissingParameter(String),
    #[error("Schema version mismatch: expected {expected}, found {found}")]
    #[serde(rename = "VERSION_MISMATCH")]
    VersionMismatch { expected: String, found: String },
    #[error("LOD {0} geometry specification is missing")]
    #[serde(rename = "MISSING_LOD_GEOMETRY")]
    MissingLodGeometry(String),
    #[error("Invalid parameter type for {parameter}: expected {expected}, found {found}")]
    #[serde(rename = "INVALID_TYPE")]
    InvalidType { 
        parameter: String, 
        expected: String, 
        found: String 
    },
    #[error("Vertical Slice Validation Error: {0}")]
    #[serde(rename = "SLICE_VALIDATION_ERROR")]
    SliceError(String),
}

/// The Truth Engine's core validator for Pharos Metadata.
/// 
/// Purpose: To prevent "BIM Bloat" and ensure interoperability by 
/// strictly validating metadata against a defined PharosSchema. 
/// This is the primary gatekeeper for the Project Prism ecosystem.
pub struct SchemaValidator;

impl SchemaValidator {
    /// Validates a PharosMetadata instance against a PharosSchema.
    /// 
    /// Why: In a multi-platform environment (Revit, Web, CLI), we must 
    /// ensure that the Single Source of Truth remains consistent. This 
    /// method performs deep validation of shared parameters, ensuring both 
    /// existence and type-safety.
    pub fn validate_metadata(schema: &PharosSchema, metadata: &PharosMetadata) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();

        // 1. Version Check
        if schema.version != metadata.schema_version {
            errors.push(ValidationError::VersionMismatch {
                expected: schema.version.clone(),
                found: metadata.schema_version.clone(),
            });
        }

        // 2. Deep Parameter Validation (Existence + Type)
        for (param_name, shared_param) in &schema.parameter_standards.shared_parameters {
            match metadata.parameters.get(param_name) {
                None => {
                    errors.push(ValidationError::MissingParameter(param_name.clone()));
                }
                Some(value) => {
                    // Type-safety enforcement
                    if !Self::is_type_valid(&shared_param.param_type, value) {
                        errors.push(ValidationError::InvalidType {
                            parameter: param_name.clone(),
                            expected: shared_param.param_type.clone(),
                            found: format!("{:?}", value),
                        });
                    }
                }
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /// Enforcement logic for parameter type-safety.
    /// 
    /// Why: Legacy AEC software often uses loosely-typed XML/ASHH data. 
    /// Pharos enforces strong semantic typing (TEXT, NUMBER, BOOLEAN) 
    /// to eliminate the "Hallucination Gap" during automated equipment 
    /// specification and procurement.
    fn is_type_valid(expected: &str, value: &ParameterValue) -> bool {
        match expected {
            "TEXT" => matches!(value, ParameterValue::Text(_)),
            "NUMBER" | "ELECTRICAL_POTENTIAL" | "ELECTRICAL_WATTAGE" | "HVAC_POWER" | "PIPING_SIZE" => {
                 // Numbers can be passed as actual numbers or text if they have units
                 matches!(value, ParameterValue::Number(_) | ParameterValue::Text(_))
            }
            "BOOLEAN" => matches!(value, ParameterValue::Boolean(_)),
            "URL_ARRAY" | "ENUM_ARRAY" => matches!(value, ParameterValue::Array(_)),
            "OBJECT" => matches!(value, ParameterValue::Object(_)),
            _ => true, // Fallback for unknown types during evolution
        }
    }
}

pub struct LodValidator;

impl LodValidator {
    pub fn verify_lod(metadata: &PharosMetadata, target_lod: &str) -> Result<(), ValidationError> {
        if !metadata.lod_geometry_specs.contains_key(target_lod) {
            return Err(ValidationError::MissingLodGeometry(target_lod.to_string()));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;
    use crate::models::schema::{ParameterStandards, BloatRules, SharedParameter};
    use crate::models::metadata::{Classification, PerformanceMetadata};

    fn create_mock_schema() -> PharosSchema {
        let mut shared_params = BTreeMap::new();
        shared_params.insert("PKD_Manufacturer".to_string(), SharedParameter {
            param_type: "TEXT".to_string(),
            attributes: vec!["Lookup".to_string()],
        });
        shared_params.insert("PKD_Voltage".to_string(), SharedParameter {
            param_type: "ELECTRICAL_POTENTIAL".to_string(),
            attributes: vec!["Lookup".to_string()],
        });

        PharosSchema {
            version: "1.0.0".to_string(),
            lod_definitions: BTreeMap::new(),
            parameter_standards: ParameterStandards {
                classification: "OmniClass".to_string(),
                shared_parameters: shared_params,
            },
            bloat_rules: BloatRules {
                max_file_size_delta_kb: 50,
                forbidden_metadata: Vec::new(),
                regional_stripping_rules: BTreeMap::new(),
                procedural_preference: true,
            },
            unit_mapping: BTreeMap::new(),
        }
    }

    fn create_mock_metadata() -> PharosMetadata {
        let mut params = BTreeMap::new();
        params.insert("PKD_Manufacturer".to_string(), ParameterValue::Text("Test".to_string()));
        params.insert("PKD_Voltage".to_string(), ParameterValue::Text("208V".to_string()));

        PharosMetadata {
            metadata_id: "ID-1".to_string(),
            name: "Test Product".to_string(),
            schema_version: "1.0.0".to_string(),
            classification: Classification {
                omniclass_table_23: "23-00".to_string(),
                category: "Test".to_string(),
            },
            parameters: params,
            lod_geometry_specs: BTreeMap::new(),
            performance_metadata: PerformanceMetadata {
                estimated_rfa_size_kb: 10,
                procedural_lod_enabled: true,
                ghost_link_active: false,
            },
        }
    }

    #[test]
    fn test_should_pass_validation_when_metadata_is_valid() {
        let schema = create_mock_schema();
        let metadata = create_mock_metadata();
        assert!(SchemaValidator::validate_metadata(&schema, &metadata).is_ok());
    }

    #[test]
    fn test_should_fail_validation_when_type_mismatch() {
        let schema = create_mock_schema();
        let mut metadata = create_mock_metadata();
        // Replace TEXT with a Boolean for a field that expects TEXT
        metadata.parameters.insert("PKD_Manufacturer".to_string(), ParameterValue::Boolean(true));
        
        let result = SchemaValidator::validate_metadata(&schema, &metadata);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(matches!(errors[0], ValidationError::InvalidType { .. }));
    }
}
