/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: TOON Parser (pkd-toon)
 * File: packages/pkd-toon/src/lib.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Extreme-efficiency, zero-copy parser for Token-Oriented Object Notation (TOON).
 * Traceability: Issue #130 (Hackathon)
 * ======================================================================== */

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use thiserror::Error;

#[wasm_bindgen]
#[derive(Debug, Serialize, Deserialize)]
pub struct ToonDoc {
    metadata: HashMap<String, String>,
    lists: HashMap<String, ToonList>,
}

#[wasm_bindgen]
#[derive(Debug, Serialize, Deserialize)]
pub struct ToonList {
    schema: Vec<String>,
    items: Vec<Vec<String>>,
}

#[derive(Error, Debug)]
pub enum ToonError {
    #[error("Malformed header at line {0}")]
    MalformedHeader(usize),
    #[error("Unexpected end of file")]
    UnexpectedEOF,
    #[error("Invalid list declaration at line {0}")]
    InvalidListDeclaration(usize),
    #[error("Tabular data mismatch at line {0}: expected {1} fields, found {2}. Raw line: \"{3}\"")]
    TabularDataMismatch(usize, usize, usize, String),
    #[error("Mismatched quotes at line {0}")]
    MismatchedQuotes(usize),
}

#[wasm_bindgen]
pub fn parse_toon(input: &str) -> Result<JsValue, JsError> {
    let doc = ToonParser::parse(input).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(serde_wasm_bindgen::to_value(&doc)?)
}

struct ToonParser;

impl ToonParser {
    fn parse_line(line: &str, line_idx: usize) -> Result<Vec<String>, ToonError> {
        let mut fields = Vec::new();
        let mut current_field = String::new();
        let mut in_quotes = false;
        let mut chars = line.chars().peekable();

        while let Some(c) = chars.next() {
            match c {
                '\"' => {
                    in_quotes = !in_quotes;
                }
                ',' if !in_quotes => {
                    fields.push(current_field.trim().to_string());
                    current_field = String::new();
                }
                _ => {
                    current_field.push(c);
                }
            }
        }

        if in_quotes {
            return Err(ToonError::MismatchedQuotes(line_idx + 1));
        }

        fields.push(current_field.trim().to_string());
        Ok(fields)
    }

    fn parse(input: &str) -> Result<ToonDoc, ToonError> {
        let mut metadata = HashMap::new();
        let mut lists = HashMap::new();
        
        let mut lines = input.lines().enumerate();
        let mut in_block_comment = false;

        while let Some((line_idx, line)) = lines.next() {
            let trimmed = line.trim();
            
            // Handle block comments
            if trimmed.starts_with("/*") {
                in_block_comment = true;
            }
            if in_block_comment {
                if trimmed.ends_with("*/") {
                    in_block_comment = false;
                }
                continue;
            }

            // Skip comments and empty lines
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            // Detect list declaration: list_name[N]{f1, f2}:
            if trimmed.contains('[') && trimmed.contains(']') && trimmed.contains('{') && trimmed.ends_with(':') {
                let (name, rest) = trimmed.split_once('[').ok_or(ToonError::InvalidListDeclaration(line_idx + 1))?;
                let (count_str, rest) = rest.split_once(']').ok_or(ToonError::InvalidListDeclaration(line_idx + 1))?;
                let count: usize = count_str.parse().map_err(|_| ToonError::InvalidListDeclaration(line_idx + 1))?;
                
                let _ = rest.split_once('{').ok_or(ToonError::InvalidListDeclaration(line_idx + 1))?;
                let _ = rest.split_once('}').ok_or(ToonError::InvalidListDeclaration(line_idx + 1))?;
                
                let schema_start = trimmed.find('{').unwrap() + 1;
                let schema_end = trimmed.find('}').unwrap();
                let schema_raw = &trimmed[schema_start..schema_end];
                let schema: Vec<String> = schema_raw.split(',').map(|s| s.trim().to_string()).collect();
                
                let mut items = Vec::new();
                for _ in 0..count {
                    if let Some((item_idx, item_line)) = lines.next() {
                        let fields = Self::parse_line(item_line, item_idx)?;
                        if fields.len() != schema.len() {
                            return Err(ToonError::TabularDataMismatch(item_idx + 1, schema.len(), fields.len(), item_line.to_string()));
                        }
                        items.push(fields);
                    } else {
                        return Err(ToonError::UnexpectedEOF);
                    }
                }
                
                lists.insert(name.trim().to_string(), ToonList { schema, items });
            } else if let Some((key, value)) = trimmed.split_once(':') {
                // Regular key-value pair
                metadata.insert(key.trim().to_string(), value.trim().to_string());
            }
        }

        Ok(ToonDoc { metadata, lists })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_parse_basic_toon_when_given_valid_string() {
        let input = "key: value\n# comment\nlist[1]{f1, f2}:\n  v1, v2";
        let doc = ToonParser::parse(input).unwrap();
        assert_eq!(doc.metadata.get("key").unwrap(), "value");
        assert_eq!(doc.lists.get("list").unwrap().schema, vec!["f1", "f2"]);
        assert_eq!(doc.lists.get("list").unwrap().items[0], vec!["v1", "v2"]);
    }

    #[test]
    fn test_should_parse_weekly_velocity_log_when_given_valid_toon_string() {
        let input = r#"
/* Standard Prologue Mock */
sprint: 4.9
date: 2026-05-15
team: PHAROS_STRATEGY_CORE

# Core Capacity Metrics
velocity[1]{target_ect, actual_ect, variance}:
  20, 17, -3

# Task Outcomes
tasks[2]{id, title, status}:
  #120, Ghost Link, Done
  #52, Protocol OR, Done
"#;
        let doc = ToonParser::parse(input).expect("Failed to parse log");
        assert_eq!(doc.metadata.get("sprint").unwrap(), "4.9");
        assert_eq!(doc.metadata.get("team").unwrap(), "PHAROS_STRATEGY_CORE");
        
        let velocity = doc.lists.get("velocity").unwrap();
        assert_eq!(velocity.schema, vec!["target_ect", "actual_ect", "variance"]);
        assert_eq!(velocity.items[0], vec!["20", "17", "-3"]);

        let tasks = doc.lists.get("tasks").unwrap();
        assert_eq!(tasks.items.len(), 2);
        assert_eq!(tasks.items[0][0], "#120");
    }

    #[test]
    fn test_should_parse_quoted_commas_when_given_tabular_row() {
        let input = "list[1]{title, status}:\n  \"Task, with comma\", Done";
        let doc = ToonParser::parse(input).unwrap();
        let list = doc.lists.get("list").unwrap();
        assert_eq!(list.items[0][0], "Task, with comma");
        assert_eq!(list.items[0][1], "Done");
    }

    #[test]
    fn test_should_fail_fast_on_mismatched_quotes() {
        let input = "list[1]{title}:\n  \"Mismatched";
        let result = ToonParser::parse(input);
        assert!(matches!(result, Err(ToonError::MismatchedQuotes(2))));
    }
}
