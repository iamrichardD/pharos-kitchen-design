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
use crate::ast::Command;
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
            let mut selections = Vec::new();
            let mut returns = Vec::new();
            let mut in_returns = false;

            for token in &tokens[1..] {
                if token.to_lowercase() == "return" {
                    in_returns = true;
                    continue;
                }

                if in_returns {
                    returns.push(token.clone());
                } else {
                    if let Some((k, v)) = parse_attr_value(token) {
                        selections.push((Some(k), v));
                    } else {
                        selections.push((None, token.clone()));
                    }
                }
            }
            Ok(Command::Query { selections, returns })
        }
        "delete" => {
            let mut selections = Vec::new();
            for token in &tokens[1..] {
                if let Some((k, v)) = parse_attr_value(token) {
                    selections.push((Some(k), v));
                } else {
                    selections.push((None, token.clone()));
                }
            }
            Ok(Command::Delete(selections))
        }
        "change" => {
            let mut selections = Vec::new();
            let mut modifications = Vec::new();
            let mut force = false;
            let mut phase = 0; // 0: selection, 1: make/force

            for token in &tokens[1..] {
                let lower = token.to_lowercase();
                if lower == "make" || lower == "force" {
                    force = lower == "force";
                    phase = 1;
                    continue;
                }

                if phase == 0 {
                    if let Some((k, v)) = parse_attr_value(token) {
                        selections.push((Some(k), v));
                    } else {
                        selections.push((None, token.clone()));
                    }
                } else {
                    if let Some((k, v)) = parse_attr_value(token) {
                        modifications.push((k, v));
                    } else {
                        return Err(ProtocolError::SyntaxError(format!("Change modification expects field=value, found '{}'", token)));
                    }
                }
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
            assert_eq!(selections, vec![(Some("manufacturer".to_string()), "3m".to_string())]);
            assert_eq!(returns, vec!["name".to_string(), "voltage".to_string()]);
        } else {
            panic!("Expected Query AST");
        }
    }

    #[test]
    fn test_should_fail_on_unknown_command() {
        let result = parse_command("invalid_cmd");
        assert!(matches!(result, Err(ProtocolError::UnknownCommand(_))));
    }
}
