/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Entry
 * File: lib.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Entry point for the pkd-core Rust/WASM engine.
 * Traceability: Issue #9, ADR 0002
 * ======================================================================== */

pub mod models;
pub mod validator;
pub mod bindings;
pub mod slices;
pub mod security;

pub use models::schema::PharosSchema;
pub use models::metadata::PharosMetadata;
pub use models::types::ParameterValue;

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_should_deserialize_sample_metadata_when_valid_json_provided() {
        let data = include_str!("../samples/commercial-dishwasher.json");
        let metadata: PharosMetadata = serde_json::from_str(data).expect("Failed to deserialize sample");
        
        assert_eq!(metadata.metadata_id, "PHX-DW-001");
        assert_eq!(metadata.parameters.get("PKD_Manufacturer").unwrap(), &ParameterValue::Text("Pharos Kitchen Systems".to_string()));
    }

    #[test]
    fn test_should_deserialize_schema_when_valid_json_provided() {
        let data = include_str!("../schema/pharos-schema.json");
        let schema: PharosSchema = serde_json::from_str(data).expect("Failed to deserialize schema");
        
        assert_eq!(schema.version, "1.0.0");
        assert!(schema.lod_definitions.contains_key("100"));
    }
}
