/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Validation
 * File: validator.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Validation engine for PKD metadata and LOD compliance.
 * Traceability: Issue #9, ADR 0002
 * ======================================================================== */

use crate::models::schema::PharosSchema;
use crate::models::metadata::PharosMetadata;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ValidationError {
    #[error("Missing required PKD parameter: {0}")]
    MissingParameter(String),
    #[error("Schema version mismatch: expected {expected}, found {found}")]
    VersionMismatch { expected: String, found: String },
    #[error("LOD {0} geometry specification is missing")]
    MissingLodGeometry(String),
    #[error("Invalid parameter type for {0}")]
    InvalidType(String),
}

pub struct SchemaValidator;

impl SchemaValidator {
    pub fn validate_metadata(schema: &PharosSchema, metadata: &PharosMetadata) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();

        // 1. Version Check
        if schema.version != metadata.schema_version {
            errors.push(ValidationError::VersionMismatch {
                expected: schema.version.clone(),
                found: metadata.schema_version.clone(),
            });
        }

        // 2. Required Parameters Check
        for (param_name, _param_type) in &schema.parameter_standards.shared_parameters {
            if !metadata.parameters.contains_key(param_name) {
                errors.push(ValidationError::MissingParameter(param_name.clone()));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
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
    use crate::models::types::ParameterValue;
    use std::collections::BTreeMap;
    use crate::models::schema::{ParameterStandards, BloatRules};
    use crate::models::metadata::{Classification, PerformanceMetadata};

    fn create_mock_schema() -> PharosSchema {
        let mut shared_params = BTreeMap::new();
        shared_params.insert("PKD_Manufacturer".to_string(), "TEXT".to_string());
        shared_params.insert("PKD_ModelNumber".to_string(), "TEXT".to_string());

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
            },
        }
    }

    fn create_mock_metadata() -> PharosMetadata {
        let mut params = BTreeMap::new();
        params.insert("PKD_Manufacturer".to_string(), ParameterValue::Text("Test".to_string()));
        params.insert("PKD_ModelNumber".to_string(), ParameterValue::Text("M1".to_string()));

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
    fn test_should_fail_validation_when_parameter_is_missing() {
        let schema = create_mock_schema();
        let mut metadata = create_mock_metadata();
        metadata.parameters.remove("PKD_Manufacturer");
        
        let result = SchemaValidator::validate_metadata(&schema, &metadata);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.contains(&ValidationError::MissingParameter("PKD_Manufacturer".to_string())));
    }

    #[test]
    fn test_should_fail_validation_when_version_mismatch() {
        let schema = create_mock_schema();
        let mut metadata = create_mock_metadata();
        metadata.schema_version = "0.9.0".to_string();
        
        let result = SchemaValidator::validate_metadata(&schema, &metadata);
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.contains(&ValidationError::VersionMismatch {
            expected: "1.0.0".to_string(),
            found: "0.9.0".to_string(),
        }));
    }
}
