/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Models
 * File: packages/pkd-core/src/models/query.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Evaluator for RFC 2378 selection filters.
 * Traceability: Issue #138, RFC 2378 Section 2.3
 * ======================================================================== */

use crate::models::metadata::PharosMetadata;
use crate::models::types::ParameterValue;
use pharos_protocol::ast::SelectionFilter;
use pharos_protocol::ph_match;

pub trait QueryEvaluator {
    fn matches(&self, metadata: &PharosMetadata) -> bool;
}

impl QueryEvaluator for SelectionFilter {
    fn matches(&self, metadata: &PharosMetadata) -> bool {
        match self {
            SelectionFilter::Single(field_opt, pattern) => {
                if let Some(field) = field_opt {
                    // Match against a specific field
                    let value = match field.as_str() {
                        "name" => Some(metadata.name.clone()),
                        "id" | "metadata_id" => Some(metadata.metadata_id.clone()),
                        "manufacturer" => metadata
                            .parameters
                            .get("PKD_Manufacturer")
                            .map(|v| v.to_string()),
                        "model" => metadata
                            .parameters
                            .get("PKD_ModelNumber")
                            .map(|v| v.to_string()),
                        "category" => Some(metadata.classification.category.clone()),
                        _ => metadata.parameters.get(field).map(|v| v.to_string()),
                    };

                    if let Some(val) = value {
                        ph_match(&val.to_lowercase(), &pattern.to_lowercase()).unwrap_or(false)
                    } else {
                        false
                    }
                } else {
                    // Attribute-less search: match against common fields
                    // RFC 2378 doesn't strictly define this, but Pharos defaults to name/mfr/model
                    let fields_to_check = [
                        metadata.name.clone(),
                        metadata.metadata_id.clone(),
                        metadata
                            .parameters
                            .get("PKD_Manufacturer")
                            .map(|v| v.to_string())
                            .unwrap_or_default(),
                        metadata
                            .parameters
                            .get("PKD_ModelNumber")
                            .map(|v| v.to_string())
                            .unwrap_or_default(),
                    ];

                    fields_to_check.iter().any(|val| {
                        ph_match(&val.to_lowercase(), &pattern.to_lowercase()).unwrap_or(false)
                    })
                }
            }
            SelectionFilter::And(filters) => filters.iter().all(|f| f.matches(metadata)),
            SelectionFilter::Or(filters) => filters.iter().any(|f| f.matches(metadata)),
        }
    }
}

/// Filters a PharosMetadata object into a simplified map based on a 'return' clause.
/// Why: Reduces data egress for UI-only previews and enforces schema-based selection.
pub fn filter_metadata(metadata: &PharosMetadata, returns: &[String]) -> serde_json::Value {
    let effective_returns = if returns.is_empty() {
        vec![
            "metadata_id".to_string(),
            "name".to_string(),
            "manufacturer".to_string(),
            "model".to_string(),
            "category".to_string(),
        ]
    } else {
        returns.to_vec()
    };

    let mut result = serde_json::Map::new();
    for field in effective_returns {
        let value = match field.as_str() {
            "name" => Some(serde_json::Value::String(metadata.name.clone())),
            "id" | "metadata_id" => Some(serde_json::Value::String(metadata.metadata_id.clone())),
            "category" => Some(serde_json::Value::String(
                metadata.classification.category.clone(),
            )),
            "manufacturer" => metadata
                .parameters
                .get("PKD_Manufacturer")
                .map(|v| match v {
                    ParameterValue::Text(s) => serde_json::Value::String(s.clone()),
                    _ => serde_json::to_value(v).unwrap(),
                }),
            "model" => metadata.parameters.get("PKD_ModelNumber").map(|v| match v {
                ParameterValue::Text(s) => serde_json::Value::String(s.clone()),
                _ => serde_json::to_value(v).unwrap(),
            }),
            _ => metadata
                .parameters
                .get(&field)
                .map(|v| serde_json::to_value(v).unwrap()),
        };

        if let Some(val) = value {
            result.insert(field, val);
        }
    }

    serde_json::Value::Object(result)
}

/// Formats search results as a ToonDoc-compatible JSON structure.
/// Why: Enables seamless integration with the TOON parser and UI loader.
pub fn results_to_toon_json(
    results: Vec<serde_json::Value>,
    returns: &[String],
) -> serde_json::Value {
    let mut lists = serde_json::Map::new();

    let schema = if returns.is_empty() {
        // Default schema if none provided
        vec![
            "metadata_id".to_string(),
            "name".to_string(),
            "manufacturer".to_string(),
            "model".to_string(),
            "category".to_string(),
        ]
    } else {
        returns.to_vec()
    };

    let mut items = Vec::new();
    for res in results {
        let mut row = Vec::new();
        if let serde_json::Value::Object(map) = res {
            for field in &schema {
                let val = map
                    .get(field)
                    .cloned()
                    .unwrap_or(serde_json::Value::String("".to_string()));
                // TOON expects raw strings in its items lists
                let val_str = match val {
                    serde_json::Value::String(s) => s,
                    _ => val.to_string(),
                };
                row.push(val_str);
            }
        }
        items.push(row);
    }

    let mut results_list = serde_json::Map::new();
    results_list.insert("schema".to_string(), serde_json::to_value(&schema).unwrap());
    results_list.insert("items".to_string(), serde_json::to_value(&items).unwrap());

    lists.insert(
        "results".to_string(),
        serde_json::Value::Object(results_list),
    );

    let mut doc = serde_json::Map::new();
    doc.insert(
        "metadata".to_string(),
        serde_json::Value::Object(serde_json::Map::new()),
    );
    doc.insert("lists".to_string(), serde_json::Value::Object(lists));

    serde_json::Value::Object(doc)
}
