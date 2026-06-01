/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Models
 * File: metadata.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Product metadata model for PKD assets. Builder Pattern implementation.
 * Traceability: Issue #9, ADR 0002, Issue #124, Issue #148
 * ======================================================================== */

pub use pharos_protocol::metadata::{
    GeometryManifest, GeometryOperation, OperationDimensions, ParameterValue,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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

impl PharosMetadata {
    /// Rationale: Provides a fluent API for constructing complex metadata objects
    /// while ensuring all mandatory fields are present.
    pub fn builder() -> PharosMetadataBuilder {
        PharosMetadataBuilder::default()
    }
}

#[derive(Default)]
pub struct PharosMetadataBuilder {
    metadata_id: Option<String>,
    name: Option<String>,
    schema_version: Option<String>,
    classification: Option<Classification>,
    parameters: BTreeMap<String, ParameterValue>,
    lod_geometry_specs: BTreeMap<String, LodGeometrySpec>,
    geometry_manifest: Option<GeometryManifest>,
    performance_metadata: Option<PerformanceMetadata>,
}

impl PharosMetadataBuilder {
    pub fn metadata_id(mut self, id: String) -> Self {
        self.metadata_id = Some(id);
        self
    }

    pub fn name(mut self, name: String) -> Self {
        self.name = Some(name);
        self
    }

    pub fn schema_version(mut self, version: String) -> Self {
        self.schema_version = Some(version);
        self
    }

    pub fn classification(mut self, classification: Classification) -> Self {
        self.classification = Some(classification);
        self
    }

    pub fn parameters(mut self, parameters: BTreeMap<String, ParameterValue>) -> Self {
        self.parameters = parameters;
        self
    }

    pub fn add_parameter(mut self, key: String, value: ParameterValue) -> Self {
        self.parameters.insert(key, value);
        self
    }

    pub fn lod_geometry_specs(mut self, specs: BTreeMap<String, LodGeometrySpec>) -> Self {
        self.lod_geometry_specs = specs;
        self
    }

    pub fn add_lod_spec(mut self, lod: String, spec: LodGeometrySpec) -> Self {
        self.lod_geometry_specs.insert(lod, spec);
        self
    }

    pub fn geometry_manifest(mut self, manifest: GeometryManifest) -> Self {
        self.geometry_manifest = Some(manifest);
        self
    }

    pub fn performance_metadata(mut self, performance: PerformanceMetadata) -> Self {
        self.performance_metadata = Some(performance);
        self
    }

    /// Rationale: Validates that all mandatory fields are set before instantiating PharosMetadata.
    /// This prevents "failing slowly" by detecting missing configuration at the seam.
    pub fn build(self) -> Result<PharosMetadata, String> {
        let metadata_id = self.metadata_id.ok_or_else(|| "metadata_id is required".to_string())?;
        let name = self.name.ok_or_else(|| "name is required".to_string())?;
        let schema_version = self.schema_version.ok_or_else(|| "schema_version is required".to_string())?;
        let classification = self.classification.ok_or_else(|| "classification is required".to_string())?;
        let performance_metadata = self.performance_metadata.ok_or_else(|| "performance_metadata is required".to_string())?;

        Ok(PharosMetadata {
            metadata_id,
            name,
            schema_version,
            classification,
            parameters: self.parameters,
            lod_geometry_specs: self.lod_geometry_specs,
            geometry_manifest: self.geometry_manifest,
            performance_metadata,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_instantiate_metadata_when_using_builder() {
        let metadata = PharosMetadata::builder()
            .metadata_id("test-id".to_string())
            .name("Test Product".to_string())
            .schema_version("1.0.0".to_string())
            .classification(Classification {
                omniclass_table_23: "23-75 70 11 11".to_string(),
                category: "Fryers".to_string(),
            })
            .performance_metadata(PerformanceMetadata {
                estimated_rfa_size_kb: 150,
                procedural_lod_enabled: true,
                ghost_link_active: false,
            })
            .build()
            .expect("Builder should succeed with mandatory fields");

        assert_eq!(metadata.metadata_id, "test-id");
        assert_eq!(metadata.name, "Test Product");
        assert_eq!(metadata.classification.category, "Fryers");
        assert!(metadata.parameters.is_empty());
    }

    #[test]
    fn test_should_fail_when_mandatory_field_missing() {
        let result = PharosMetadata::builder()
            .name("Test Product".to_string())
            .build();

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("metadata_id"));
    }
}
