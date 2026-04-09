/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/lexer.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Robust tokenizer for RFC 2378 command syntax.
 * Traceability: ADR 0024, RFC 2378 Section 2.1
 * ======================================================================== */

use crate::parser::ProtocolError;

/// Tokenizes an RFC 2378 command line.
/// 
/// Handles:
/// - Whitespace-separated tokens.
/// - Double-quoted strings for preserving order and whitespace.
/// - Escape sequences: \n, \t, \", \\
pub fn tokenize(line: &str) -> Result<Vec<String>, ProtocolError> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut escaped = false;
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];
        if escaped {
            match c {
                'n' => current.push('\n'),
                't' => current.push('\t'),
                '"' => current.push('"'),
                '\\' => current.push('\\'),
                _ => current.push(c),
            }
            escaped = false;
        } else if c == '\\' {
            escaped = true;
        } else if c == '"' {
            in_quotes = !in_quotes;
        } else if c.is_whitespace() && !in_quotes {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
        } else {
            current.push(c);
        }
        i += 1;
    }

    if in_quotes {
        return Err(ProtocolError::SyntaxError("Unclosed double quote".to_string()));
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    Ok(tokens)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_tokenize_simple_command() {
        let tokens = tokenize("status").unwrap();
        assert_eq!(tokens, vec!["status"]);
    }

    #[test]
    fn test_should_tokenize_multiple_args() {
        let tokens = tokenize("query name=doe john").unwrap();
        assert_eq!(tokens, vec!["query", "name=doe", "john"]);
    }

    #[test]
    fn test_should_handle_quoted_strings() {
        let tokens = tokenize("query name=\"doe john\"").unwrap();
        assert_eq!(tokens, vec!["query", "name=doe john"]);
    }

    #[test]
    fn test_should_handle_escapes() {
        let tokens = tokenize("add comment=\"line1\\nline2\"").unwrap();
        assert_eq!(tokens, vec!["add", "comment=line1\nline2"]);
    }

    #[test]
    fn test_should_fail_on_unclosed_quotes() {
        let result = tokenize("query name=\"unclosed");
        assert!(result.is_err());
    }
}
