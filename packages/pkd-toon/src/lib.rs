/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: TOON Parser (pkd-toon)
 * File: packages/pkd-toon/src/lib.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Extreme-efficiency, zero-copy parser for Token-Oriented Object Notation (TOON).
 * Traceability: Issue #130, Issue #139 (Enhanced Diagnostics)
 * Last Updated: 2026-06-02
 * ======================================================================== */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use wasm_bindgen::prelude::*;

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

#[derive(Error, Debug, Serialize, Deserialize)]
#[serde(tag = "code", content = "details")]
pub enum ToonError {
    #[error("Malformed header at line {line}")]
    MalformedHeader { line: usize },
    #[error("Unexpected end of file")]
    UnexpectedEOF,
    #[error("Invalid list declaration at line {line}")]
    InvalidListDeclaration { line: usize },
    #[error(
        "Tabular data mismatch at line {line}: expected {expected} fields, found {found}. Snippet: \"{snippet}\""
    )]
    TabularDataMismatch {
        line: usize,
        expected: usize,
        found: usize,
        snippet: String,
    },
    #[error("Mismatched quotes at line {line}, col {col}")]
    MismatchedQuotes {
        line: usize,
        col: usize,
        snippet: String,
    },
}

#[derive(Serialize)]
struct ToonDiagnostic {
    message: String,
    #[serde(flatten)]
    error: ToonError,
}

#[wasm_bindgen]
pub fn parse_toon(input: &str) -> Result<JsValue, JsValue> {
    // Rationale: See PR #188 (Relational Handle Mapping)
    use std::panic::catch_unwind;
    let input_safe = input.to_string();
    let result = catch_unwind(move || ToonParser::parse(&input_safe));

    let serializer = serde_wasm_bindgen::Serializer::new().serialize_maps_as_objects(true);

    match result {
        Ok(Ok(doc)) => Ok(doc
            .serialize(&serializer)
            .map_err(|e| JsValue::from_str(&e.to_string()))?),
        Ok(Err(e)) => {
            let diagnostic = ToonDiagnostic {
                message: e.to_string(),
                error: e,
            };
            Err(serde_wasm_bindgen::to_value(&diagnostic)
                .unwrap_or_else(|_| JsValue::from_str(&diagnostic.message)))
        }
        Err(_) => Err(JsValue::from_str(
            "Panic in pkd-toon parser (Isolation Sentinel triggered)",
        )),
    }
}

struct ToonParser;

impl ToonParser {
    fn parse_line(line: &str, line_idx: usize) -> Result<Vec<String>, ToonError> {
        let mut fields = Vec::new();
        let mut current_field = String::new();
        let mut in_quotes = false;
        let mut quote_start_col = 0;

        for (col_idx, c) in line.chars().enumerate() {
            match c {
                '\"' => {
                    if !in_quotes {
                        quote_start_col = col_idx + 1;
                    }
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
            return Err(ToonError::MismatchedQuotes {
                line: line_idx + 1,
                col: quote_start_col,
                snippet: line.to_string(),
            });
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
            if trimmed.contains('[')
                && trimmed.contains(']')
                && trimmed.contains('{')
                && trimmed.ends_with(':')
            {
                let (name, rest) = trimmed
                    .split_once('[')
                    .ok_or(ToonError::InvalidListDeclaration { line: line_idx + 1 })?;
                let (count_str, rest) = rest
                    .split_once(']')
                    .ok_or(ToonError::InvalidListDeclaration { line: line_idx + 1 })?;
                let count: usize = count_str
                    .parse()
                    .map_err(|_| ToonError::InvalidListDeclaration { line: line_idx + 1 })?;

                let _ = rest
                    .split_once('{')
                    .ok_or(ToonError::InvalidListDeclaration { line: line_idx + 1 })?;
                let _ = rest
                    .split_once('}')
                    .ok_or(ToonError::InvalidListDeclaration { line: line_idx + 1 })?;

                let schema_start = trimmed.find('{').unwrap() + 1;
                let schema_end = trimmed.find('}').unwrap();
                let schema_raw = &trimmed[schema_start..schema_end];
                let schema: Vec<String> = schema_raw
                    .split(',')
                    .map(|s| s.trim().to_string())
                    .collect();

                let mut items = Vec::new();
                for _ in 0..count {
                    if let Some((item_idx, item_line)) = lines.next() {
                        let fields = Self::parse_line(item_line, item_idx)?;
                        if fields.len() != schema.len() {
                            return Err(ToonError::TabularDataMismatch {
                                line: item_idx + 1,
                                expected: schema.len(),
                                found: fields.len(),
                                snippet: item_line.to_string(),
                            });
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
        assert_eq!(
            velocity.schema,
            vec!["target_ect", "actual_ect", "variance"]
        );
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
    fn test_should_handle_extreme_density_logs_when_parsing_100k_entries() {
        let mut input = String::from("logs[100000]{t, l, m}:\n");
        for i in 0..100000 {
            input.push_str(&format!(
                "  2026-05-22T10:00:00Z, INFO, \"Message {}\"\n",
                i
            ));
        }

        let start = std::time::Instant::now();
        let doc = ToonParser::parse(&input).expect("Failed to parse 100k log");
        let duration = start.elapsed();

        assert_eq!(doc.lists.get("logs").unwrap().items.len(), 100000);
        println!("Parsed 100k entries in {:?}", duration);
    }

    #[test]
    fn test_should_parse_toon_content_when_valid_fixture_provided() {
        let content = r#"
# Project: Pharos Kitchen Design (Test Fixture)
# Purpose: Atomic verification of the TOON parser.

tasks[2]{id, title, status}:
  task_001, Implement Atomic Tests, COMPLETED
  task_002, Decouple Production Data, IN_PROGRESS
"#;
        let result = ToonParser::parse(content);
        assert!(result.is_ok(), "TOON Parse Error: {:?}", result.err());
        let doc = result.unwrap();
        let tasks = doc.lists.get("tasks").unwrap();
        assert_eq!(
            tasks.items.len(),
            2,
            "Should have parsed 2 tasks from fixture"
        );
        assert_eq!(tasks.items[0][0], "task_001");
    }

    #[test]
    fn test_should_support_relational_handles_when_given_linked_lists() {
        let input = r#"
# Parent List
parent[1]{id, name}:
  @p1, Parent One

# Child List linking to parent via handle
child[2]{id, parent_handle, note}:
  c1, @p1, First child
  c2, @p1, Second child
"#;
        let doc = ToonParser::parse(input).expect("Failed to parse linked lists");

        let parent = doc.lists.get("parent").unwrap();
        assert_eq!(parent.items[0][0], "@p1");

        let child = doc.lists.get("child").unwrap();
        assert_eq!(child.items[0][1], "@p1");
        assert_eq!(child.items[1][1], "@p1");
    }

    #[test]
    fn test_should_support_complex_handle_syntax_when_given_namespaced_links() {
        let input = r#"
components[1]{id, type}:
  @comp:fryer_01, Fryer

sensors[1]{id, target}:
  @sens:temp_01, @comp:fryer_01
"#;
        let doc = ToonParser::parse(input).expect("Failed to parse complex handles");

        let components = doc.lists.get("components").unwrap();
        assert_eq!(components.items[0][0], "@comp:fryer_01");

        let sensors = doc.lists.get("sensors").unwrap();
        assert_eq!(sensors.items[0][1], "@comp:fryer_01");
    }

    #[test]
    fn test_should_report_mismatched_quotes_with_column_when_parsing_invalid_line() {
        let input = "list[1]{f1}:\n  \"unclosed quote";
        let result = ToonParser::parse(input);
        assert!(result.is_err());
        if let Err(ToonError::MismatchedQuotes { line, col, .. }) = result {
            assert_eq!(line, 2);
            assert_eq!(col, 3);
        } else {
            panic!("Expected MismatchedQuotes error, got {:?}", result.err());
        }
    }

    #[test]
    fn test_should_report_tabular_mismatch_with_snippet_when_given_short_row() {
        let input = "list[1]{f1, f2}:\n  only_one";
        let result = ToonParser::parse(input);
        assert!(result.is_err());
        if let Err(ToonError::TabularDataMismatch {
            line,
            expected,
            found,
            snippet,
        }) = result
        {
            assert_eq!(line, 2);
            assert_eq!(expected, 2);
            assert_eq!(found, 1);
            assert_eq!(snippet, "  only_one");
        } else {
            panic!("Expected TabularDataMismatch error, got {:?}", result.err());
        }
    }
}
