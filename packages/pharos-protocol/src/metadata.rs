/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Metadata
 * File: packages/pharos-protocol/src/metadata.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Shared semantic model for metadata extraction and normalization.
 * Traceability: Issue #60, ADR 0024
 * ======================================================================== */

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(untagged)]
pub enum ParameterValue {
    Text(String),
    Number(f64),
    Boolean(bool),
    Url(String),
    Array(Vec<ParameterValue>),
    Object(BTreeMap<String, String>),
}

impl fmt::Display for ParameterValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParameterValue::Text(s) => write!(f, "{}", s),
            ParameterValue::Number(n) => write!(f, "{}", n),
            ParameterValue::Boolean(b) => write!(f, "{}", b),
            ParameterValue::Url(s) => write!(f, "{}", s),
            ParameterValue::Array(v) => {
                let parts: Vec<String> = v.iter().map(|v| v.to_string()).collect();
                write!(f, "{}", parts.join(", "))
            }
            ParameterValue::Object(m) => {
                let parts: Vec<String> = m.iter().map(|(k, v)| format!("{}={}", k, v)).collect();
                write!(f, "{{{}}}", parts.join(", "))
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum NormalizationStatus {
    Healthy,
    UnverifiedRawData,
    Timeout,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct PharosMetadataBuffer {
    pub status: NormalizationStatus,
    pub manufacturer: String,
    pub parameters: BTreeMap<String, ParameterValue>,
    pub raw_input: String,
    pub rejection_reason: Option<String>,
}

impl PharosMetadataBuffer {
    pub fn new(manufacturer: &str, raw_input: &str) -> Self {
        Self {
            status: NormalizationStatus::UnverifiedRawData,
            manufacturer: manufacturer.to_string(),
            parameters: BTreeMap::new(),
            raw_input: raw_input.to_string(),
            rejection_reason: None,
        }
    }
}
