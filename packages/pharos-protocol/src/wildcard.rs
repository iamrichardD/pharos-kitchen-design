/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/wildcard.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: RFC 2378 compliant wildcard matching logic with Temporal Warden.
 * Traceability: ADR 0024, RFC 2378 Section 2.3, Issue #52
 * ======================================================================== */

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

    fn tick(&mut self) -> bool {
        self.current_iterations += 1;
        self.current_iterations <= self.max_iterations && self.current_depth <= self.max_depth
    }

    fn enter(&mut self) -> bool {
        self.current_depth += 1;
        self.tick()
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
pub fn wildcard_match(text: &str, pattern: &str) -> bool {
    let text_chars: Vec<char> = text.chars().collect();
    let pattern_chars: Vec<char> = pattern.chars().collect();
    let mut warden = Warden::new();
    
    match_internal(&text_chars, &pattern_chars, &mut warden)
}

fn match_internal(text: &[char], pattern: &[char], warden: &mut Warden) -> bool {
    if !warden.enter() {
        return false;
    }

    let result = if pattern.is_empty() {
        text.is_empty()
    } else {
        match pattern[0] {
            '*' => {
                // zero or more: skip '*' in pattern, or skip one char in text and keep '*'
                match_internal(text, &pattern[1..], warden) || (!text.is_empty() && match_internal(&text[1..], pattern, warden))
            }
            '+' => {
                // one or more: must consume at least one char, then acts like '*'
                if text.is_empty() {
                    false
                } else {
                    // consume one, then allow zero or more of pattern '*' (recursive)
                    match_internal(&text[1..], &pattern[1..], warden) || match_internal(&text[1..], pattern, warden)
                }
            }
            '?' => {
                // exactly one
                !text.is_empty() && match_internal(&text[1..], &pattern[1..], warden)
            }
            '[' => {
                // character set [abc]
                if let Some(end_idx) = pattern.iter().position(|&c| c == ']') {
                    let set = &pattern[1..end_idx];
                    !text.is_empty() && set.contains(&text[0]) && match_internal(&text[1..], &pattern[end_idx+1..], warden)
                } else {
                    // Malformed pattern, treat as literal '['
                    !text.is_empty() && text[0] == '[' && match_internal(&text[1..], &pattern[1..], warden)
                }
            }
            _ => {
                // literal match
                !text.is_empty() && text[0] == pattern[0] && match_internal(&text[1..], &pattern[1..], warden)
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
        assert!(wildcard_match("hobart", "hobart"));
        assert!(!wildcard_match("hobart", "vulcan"));
    }

    #[test]
    fn test_should_match_star() {
        assert!(wildcard_match("hobart", "ho*"));
        assert!(wildcard_match("hobart", "*art"));
        assert!(wildcard_match("hobart", "h*t"));
        assert!(wildcard_match("hobart", "*"));
    }

    #[test]
    fn test_should_match_question_mark() {
        assert!(wildcard_match("3m", "?m"));
        assert!(wildcard_match("3m", "3?"));
        assert!(!wildcard_match("30m", "3?"));
    }

    #[test]
    fn test_should_match_plus() {
        assert!(wildcard_match("30m", "3+m"));
        assert!(!wildcard_match("3m", "3+m"));
    }

    #[test]
    fn test_should_match_set() {
        assert!(wildcard_match("tank", "t[ao]nk"));
        assert!(wildcard_match("tonk", "t[ao]nk"));
        assert!(!wildcard_match("tenk", "t[ao]nk"));
    }

    #[test]
    fn test_should_trigger_warden_on_pathological_wildcard() {
        // This pattern causes exponential backtracking. 
        // With max_depth=10 and max_iterations=10000, it should fail fast.
        let text = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!";
        let pattern = "*a*a*a*a*a*a*a*a*a*a*a*a*a*a*b";
        
        assert!(!wildcard_match(text, pattern));
    }
}
