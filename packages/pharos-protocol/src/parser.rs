/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/parser.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Stateless parser converting tokens into a Command AST.
 * Traceability: ADR 0024, RFC 2378 Appendix C
 * ======================================================================== */

use thiserror::Error;
use crate::ast::{Command, SelectionFilter};
use crate::lexer::tokenize;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum ProtocolError {
    #[error("Unknown command: {0}")]
    UnknownCommand(String),
    #[error("Syntax error: {0}")]
    SyntaxError(String),
    #[error("Invalid argument: {0}")]
    InvalidArgument(String),
}

/// Parses a raw command string into a Command AST.
pub fn parse_command(line: &str) -> Result<Command, ProtocolError> {
    let tokens = tokenize(line)?;
    if tokens.is_empty() {
        return Err(ProtocolError::SyntaxError("Empty command line".to_string()));
    }

    let keyword = tokens[0].to_lowercase();
    match keyword.as_str() {
        "status" => Ok(Command::Status),
        "siteinfo" => Ok(Command::SiteInfo),
        "fields" => Ok(Command::Fields(tokens[1..].to_vec())),
        "id" => {
            if tokens.len() < 2 {
                return Err(ProtocolError::SyntaxError("ID command requires an identifier".to_string()));
            }
            Ok(Command::Id(tokens[1..].join(" ")))
        }
        "set" => Ok(Command::Set(tokens[1..].to_vec())),
        "login" => {
            if tokens.len() < 2 {
                return Err(ProtocolError::SyntaxError("Login command requires an alias".to_string()));
            }
            Ok(Command::Login(tokens[1].clone()))
        }
        "logout" => Ok(Command::Logout),
        "answer" => {
            if tokens.len() < 2 {
                return Err(ProtocolError::SyntaxError("Answer command requires a response".to_string()));
            }
            Ok(Command::Answer(tokens[1].clone()))
        }
        "clear" => {
            if tokens.len() < 2 {
                return Err(ProtocolError::SyntaxError("Clear command requires a password".to_string()));
            }
            Ok(Command::Clear(tokens[1].clone()))
        }
        "email" => {
            if tokens.len() < 2 {
                return Err(ProtocolError::SyntaxError("Email command requires a user ID".to_string()));
            }
            Ok(Command::Email(tokens[1].clone()))
        }
        "xlogin" => {
            if tokens.len() < 3 {
                return Err(ProtocolError::SyntaxError("XLogin requires an option and an alias".to_string()));
            }
            let option = tokens[1].parse::<u32>().map_err(|_| ProtocolError::InvalidArgument("XLogin option must be numeric".to_string()))?;
            Ok(Command::XLogin(option, tokens[2].clone()))
        }
        "add" => {
            let mut pairs = Vec::new();
            for token in &tokens[1..] {
                if let Some((k, v)) = parse_attr_value(token) {
                    pairs.push((k, v));
                } else {
                    return Err(ProtocolError::SyntaxError(format!("Add command expects field=value pairs, found '{}'", token)));
                }
            }
            Ok(Command::Add(pairs))
        }
        "query" | "ph" => {
            let mut pos = 1;
            let selections = parse_expression(&tokens, &mut pos, &["return"], 0)?;

            let mut returns = Vec::new();
            if pos < tokens.len() && tokens[pos].to_lowercase() == "return" {
                pos += 1;
                returns.extend(tokens[pos..].iter().cloned());
            }
            Ok(Command::Query { selections, returns })
        }
        "delete" => {
            let mut pos = 1;
            let selections = parse_expression(&tokens, &mut pos, &[], 0)?;
            Ok(Command::Delete(selections))
        }
        "change" => {
            let mut pos = 1;
            let selections = parse_expression(&tokens, &mut pos, &["make", "force"], 0)?;

            let mut modifications = Vec::new();
            let mut force = false;

            if pos < tokens.len() {
                let lower = tokens[pos].to_lowercase();
                if lower == "make" || lower == "force" {
                    force = lower == "force";
                    pos += 1;
                }
            }

            while pos < tokens.len() {
                if let Some((k, v)) = parse_attr_value(&tokens[pos]) {
                    modifications.push((k, v));
                } else {
                    return Err(ProtocolError::SyntaxError(format!("Change modification expects field=value, found '{}'", tokens[pos])));
                }
                pos += 1;
            }
            Ok(Command::Change { selections, modifications, force })
        }
        "help" => {
            let mut target = None;
            let mut topics = Vec::new();
            if tokens.len() > 1 {
                let first = tokens[1].to_lowercase();
                if first == "native" || first == "ph" {
                    target = Some(first);
                    topics.extend(tokens[2..].iter().cloned());
                } else {
                    topics.extend(tokens[1..].iter().cloned());
                }
            }
            Ok(Command::Help { target, topics })
        }
        "auth" => {
            if tokens.len() < 3 {
                return Err(ProtocolError::SyntaxError("Auth requires public_key and signature".to_string()));
            }
            Ok(Command::Auth {
                public_key: tokens[1].clone(),
                signature: tokens[2].clone(),
            })
        }
        "auth-check" => {
            if tokens.len() < 4 {
                return Err(ProtocolError::SyntaxError("AuthCheck requires public_key, signature, and challenge".to_string()));
            }
            Ok(Command::AuthCheck {
                public_key: tokens[1].clone(),
                signature: tokens[2].clone(),
                challenge: tokens[3].clone(),
            })
        }
        "quit" | "exit" | "stop" => Ok(Command::Quit),
        _ => Err(ProtocolError::UnknownCommand(keyword)),
    }
}

const MAX_PARSE_DEPTH: usize = 10;

fn parse_expression(tokens: &[String], pos: &mut usize, stop_words: &[&str], depth: usize) -> Result<SelectionFilter, ProtocolError> {
    if depth > MAX_PARSE_DEPTH {
        return Err(ProtocolError::SyntaxError("Maximum query nesting depth exceeded".to_string()));
    }

    let mut and_filters = Vec::new();
    while *pos < tokens.len() {
        let token = &tokens[*pos];
        let lower = token.to_lowercase();
        if stop_words.contains(&lower.as_str()) {
            break;
        }
        if token == ")" {
            break;
        }

        and_filters.push(parse_or_expression(tokens, pos, stop_words, depth)?);
    }

    if and_filters.is_empty() {
        Ok(SelectionFilter::And(vec![]))
    } else if and_filters.len() == 1 {
        Ok(and_filters.remove(0))
    } else {
        Ok(SelectionFilter::And(and_filters))
    }
}

fn parse_or_expression(tokens: &[String], pos: &mut usize, stop_words: &[&str], depth: usize) -> Result<SelectionFilter, ProtocolError> {
    let mut or_filters = Vec::new();
    or_filters.push(parse_primary_expression(tokens, pos, stop_words, depth)?);

    while *pos < tokens.len() && tokens[*pos] == "|" {
        *pos += 1; // skip |
        or_filters.push(parse_primary_expression(tokens, pos, stop_words, depth)?);
    }

    if or_filters.len() == 1 {
        Ok(or_filters.remove(0))
    } else {
        Ok(SelectionFilter::Or(or_filters))
    }
}

fn parse_primary_expression(tokens: &[String], pos: &mut usize, stop_words: &[&str], depth: usize) -> Result<SelectionFilter, ProtocolError> {
    if *pos >= tokens.len() {
        return Err(ProtocolError::SyntaxError("Unexpected end of input".to_string()));
    }

    let token = &tokens[*pos];
    if token == "(" {
        *pos += 1;
        let expr = parse_expression(tokens, pos, stop_words, depth + 1)?;
        if *pos >= tokens.len() || tokens[*pos] != ")" {
            return Err(ProtocolError::SyntaxError("Missing closing parenthesis".to_string()));
        }
        *pos += 1;
        Ok(expr)
    } else {
        *pos += 1;
        if let Some((k, v)) = parse_attr_value(token) {
            Ok(SelectionFilter::Single(Some(k), v))
        } else {
            Ok(SelectionFilter::Single(None, token.clone()))
        }
    }
}

fn parse_attr_value(token: &str) -> Option<(String, String)> {
    if let Some(pos) = token.find('=') {
        let key = token[..pos].to_string();
        let value = token[pos + 1..].to_string();
        Some((key, value))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_parse_status() {
        assert_eq!(parse_command("status").unwrap(), Command::Status);
    }

    #[test]
    fn test_should_parse_query_with_projection() {
        let cmd = parse_command("query manufacturer=3m return name voltage").unwrap();
        if let Command::Query { selections, returns } = cmd {
            assert_eq!(selections, SelectionFilter::Single(Some("manufacturer".to_string()), "3m".to_string()));
            assert_eq!(returns, vec!["name".to_string(), "voltage".to_string()]);
        } else {
            panic!("Expected Query AST");
        }
    }

    #[test]
    fn test_should_parse_query_with_or_grouping() {
        let cmd = parse_command("query (manufacturer=hobart|manufacturer=vulcan) voltage=208").unwrap();
        if let Command::Query { selections, .. } = cmd {
            let expected = SelectionFilter::And(vec![
                SelectionFilter::Or(vec![
                    SelectionFilter::Single(Some("manufacturer".to_string()), "hobart".to_string()),
                    SelectionFilter::Single(Some("manufacturer".to_string()), "vulcan".to_string()),
                ]),
                SelectionFilter::Single(Some("voltage".to_string()), "208".to_string()),
            ]);
            assert_eq!(selections, expected);
        } else {
            panic!("Expected Query AST");
        }
    }

    #[test]
    fn test_should_fail_on_unbalanced_parentheses() {
        let result = parse_command("query (manufacturer=hobart");
        assert!(result.is_err());
    }

    #[test]
    fn test_should_fail_on_unknown_command() {
        let result = parse_command("invalid_cmd");
        assert!(matches!(result, Err(ProtocolError::UnknownCommand(_))));
    }
}
