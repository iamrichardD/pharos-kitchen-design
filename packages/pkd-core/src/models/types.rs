/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Types
 * File: types.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Strongly typed enums for PKD-standardized parameter values.
 * Traceability: Issue #9, ADR 0002
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
pub struct DocLink {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct AssetViews {
    pub front: Option<String>,
    pub plan: Option<String>,
    pub side: Option<String>,
    #[serde(rename = "3d")]
    pub view_3d: Option<String>,
}
