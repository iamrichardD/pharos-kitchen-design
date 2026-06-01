/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Tests
 * File: packages/pkd-core/src/tests/query_integration.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Integration tests for RFC 2378 query logic.
 * Traceability: Issue #138, Task 4.32.3
 * ======================================================================== */

use crate::bindings::PharosRegistryHandle;
use crate::models::metadata::{Classification, PerformanceMetadata, PharosMetadata};
use std::collections::BTreeMap;
use pharos_protocol::metadata::ParameterValue;

fn create_mock_metadata(id: &str, name: &str, mfr: &str, model: &str) -> PharosMetadata {
    let mut parameters = BTreeMap::new();
    parameters.insert("PKD_Manufacturer".to_string(), ParameterValue::Text(mfr.to_string()));
    parameters.insert("PKD_ModelNumber".to_string(), ParameterValue::Text(model.to_string()));
    
    PharosMetadata {
        metadata_id: id.to_string(),
        name: name.to_string(),
        schema_version: "1.0.0".to_string(),
        classification: Classification {
            omniclass_table_23: "23-00".to_string(),
            category: "Test".to_string(),
        },
        parameters,
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
fn test_should_match_query_by_manufacturer_when_using_wildcards() {
    let handle = PharosRegistryHandle::new();
    handle.cache.insert("1".to_string(), create_mock_metadata("1", "Dishwasher", "Hobart", "PHX-1"));
    handle.cache.insert("2".to_string(), create_mock_metadata("2", "Oven", "Vulcan", "V-100"));
    
    // Test exact match
    let res = handle.query_internal("query manufacturer=Hobart".to_string()).unwrap();
    let results = res["lists"]["results"]["items"].as_array().unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0][2], "Hobart");

    // Test wildcard match
    let res = handle.query_internal("query manufacturer=V*".to_string()).unwrap();
    let results = res["lists"]["results"]["items"].as_array().unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0][2], "Vulcan");
}

#[test]
fn test_query_logic_directly() {
    use crate::models::query::QueryEvaluator;
    use pharos_protocol::parse_command;
    use pharos_protocol::Command;

    let m1 = create_mock_metadata("1", "Dishwasher", "Hobart Vulcan", "PHX-1");
    
    // RFC 2378 Section 2.2 style examples
    let cmd = parse_command("query manufacturer=Hobart").unwrap();
    if let Command::Query { selections, .. } = cmd {
        assert!(selections.matches(&m1));
    }

    let cmd = parse_command("query manufacturer=Vulcan").unwrap();
    if let Command::Query { selections, .. } = cmd {
        assert!(selections.matches(&m1));
    }

    let cmd = parse_command("query manufacturer=Ho*").unwrap();
    if let Command::Query { selections, .. } = cmd {
        assert!(selections.matches(&m1));
    }

    let cmd = parse_command("query manufacturer=Vul*").unwrap();
    if let Command::Query { selections, .. } = cmd {
        assert!(selections.matches(&m1));
    }
    
    // Multiple words in query
    let cmd = parse_command("query manufacturer=\"Hobart Vulcan\"").unwrap();
    if let Command::Query { selections, .. } = cmd {
        assert!(selections.matches(&m1));
    }
}
