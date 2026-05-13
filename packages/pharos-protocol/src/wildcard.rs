/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/wildcard.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: RFC 2378 compliant wildcard matching logic with Temporal Warden.
 * Traceability: ADR 0024, RFC 2378 Section 2.3, Issue #52
 * ======================================================================== */

#[derive(Debug, PartialEq)]
pub enum WardenError {
    DepthExceeded,
    IterationsExceeded,
}

impl std::fmt::Display for WardenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WardenError::DepthExceeded => write!(f, "Temporal Warden: Maximum recursion depth exceeded."),
            WardenError::IterationsExceeded => write!(f, "Temporal Warden: Maximum iteration count exceeded."),
        }
    }
}

impl std::error::Error for WardenError {}

/// Security sentinel to prevent ReDoS and stack overflow.
struct Warden {
    max_depth: usize,
    max_iterations: usize,
    current_depth: usize,
    current_iterations: usize,
}

impl Warden {
    fn new() -> Self {
        Self {
            max_depth: 10,
            max_iterations: 10000,
            current_depth: 0,
            current_iterations: 0,
        }
    }

    fn enter(&mut self) -> Result<(), WardenError> {
        self.current_iterations += 1;
        if self.current_iterations > self.max_iterations {
            return Err(WardenError::IterationsExceeded);
        }
        self.current_depth += 1;
        if self.current_depth > self.max_depth {
            return Err(WardenError::DepthExceeded);
        }
        Ok(())
    }

    fn exit(&mut self) {
        if self.current_depth > 0 {
            self.current_depth -= 1;
        }
    }
}

/// Matches a string against a pattern containing RFC 2378 wildcards.
/// 
/// Wildcards:
/// - `*`: Matches zero or more characters.
/// - `+`: Matches one or more characters.
/// - `?`: Matches exactly one character.
/// - `[set]`: Matches any one character in the set (e.g., [aei]).
pub fn wildcard_match(text: &str, pattern: &str) -> Result<bool, WardenError> {
    let text_chars: Vec<char> = text.chars().collect();
    let pattern_chars: Vec<char> = pattern.chars().collect();
    let mut warden = Warden::new();
    
    match_internal(&text_chars, &pattern_chars, &mut warden)
}

fn match_internal(text: &[char], pattern: &[char], warden: &mut Warden) -> Result<bool, WardenError> {
    warden.enter()?;

    let result = if pattern.is_empty() {
        Ok(text.is_empty())
    } else {
        match pattern[0] {
            '*' => {
                // zero or more: skip '*' in pattern, or skip one char in text and keep '*'
                Ok(match_internal(text, &pattern[1..], warden)? || (!text.is_empty() && match_internal(&text[1..], pattern, warden)?))
            }
            '+' => {
                // one or more: must consume at least one char, then acts like '*'
                if text.is_empty() {
                    Ok(false)
                } else {
                    // consume one, then allow zero or more of pattern '*' (recursive)
                    Ok(match_internal(&text[1..], &pattern[1..], warden)? || match_internal(&text[1..], pattern, warden)?)
                }
            }
            '?' => {
                // exactly one
                Ok(!text.is_empty() && match_internal(&text[1..], &pattern[1..], warden)?)
            }
            '[' => {
                // character set [abc]
                if let Some(end_idx) = pattern.iter().position(|&c| c == ']') {
                    let set = &pattern[1..end_idx];
                    Ok(!text.is_empty() && set.contains(&text[0]) && match_internal(&text[1..], &pattern[end_idx+1..], warden)?)
                } else {
                    // Malformed pattern, treat as literal '['
                    Ok(!text.is_empty() && text[0] == '[' && match_internal(&text[1..], &pattern[1..], warden)?)
                }
            }
            _ => {
                // literal match
                Ok(!text.is_empty() && text[0] == pattern[0] && match_internal(&text[1..], &pattern[1..], warden)?)
            }
        }
    };

    warden.exit();
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_match_literal() {
        assert!(wildcard_match("hobart", "hobart").unwrap());
        assert!(!wildcard_match("hobart", "vulcan").unwrap());
    }

    #[test]
    fn test_should_match_star() {
        assert!(wildcard_match("hobart", "ho*").unwrap());
        assert!(wildcard_match("hobart", "*art").unwrap());
        assert!(wildcard_match("hobart", "h*t").unwrap());
        assert!(wildcard_match("hobart", "*").unwrap());
    }

    #[test]
    fn test_should_match_question_mark() {
        assert!(wildcard_match("3m", "?m").unwrap());
        assert!(wildcard_match("3m", "3?").unwrap());
        assert!(!wildcard_match("30m", "3?").unwrap());
    }

    #[test]
    fn test_should_match_plus() {
        assert!(wildcard_match("30m", "3+m").unwrap());
        assert!(!wildcard_match("3m", "3+m").unwrap());
    }

    #[test]
    fn test_should_match_set() {
        assert!(wildcard_match("tank", "t[ao]nk").unwrap());
        assert!(wildcard_match("tonk", "t[ao]nk").unwrap());
        assert!(!wildcard_match("tenk", "t[ao]nk").unwrap());
    }

    #[test]
    fn test_should_trigger_warden_on_pathological_wildcard() {
        // This pattern causes exponential backtracking. 
        // With max_depth=10 and max_iterations=10000, it should fail fast.
        let text = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!";
        let pattern = "*a*a*a*a*a*a*a*a*a*a*a*a*a*a*b";
        
        let result = wildcard_match(text, pattern);
        assert!(result.is_err());
        // Note: The specific error (Depth vs Iterations) may vary based on pattern complexity.
    }
}
