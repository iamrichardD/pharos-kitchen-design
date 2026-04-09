/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/wildcard.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: RFC 2378 compliant wildcard matching logic.
 * Traceability: ADR 0024, RFC 2378 Section 2.3
 * ======================================================================== */

/// Matches a string against a pattern containing RFC 2378 wildcards.
/// 
/// Wildcards:
/// - `*`: Matches zero or more characters.
/// - `+`: Matches one or more characters.
/// - `?`: Matches exactly one character.
/// - `[set]`: Matches any one character in the set (e.g., [aei]).
pub fn wildcard_match(text: &str, pattern: &str) -> bool {
    // Basic implementation using a recursive approach for flexibility.
    // For high-performance, this could be converted to a regex or NFA.
    let text_chars: Vec<char> = text.chars().collect();
    let pattern_chars: Vec<char> = pattern.chars().collect();
    
    match_internal(&text_chars, &pattern_chars)
}

fn match_internal(text: &[char], pattern: &[char]) -> bool {
    if pattern.is_empty() {
        return text.is_empty();
    }

    match pattern[0] {
        '*' => {
            // zero or more: skip '*' in pattern, or skip one char in text and keep '*'
            match_internal(text, &pattern[1..]) || (!text.is_empty() && match_internal(&text[1..], pattern))
        }
        '+' => {
            // one or more: must consume at least one char, then acts like '*'
            if text.is_empty() {
                false
            } else {
                // consume one, then allow zero or more of pattern '*' (recursive)
                match_internal(&text[1..], &pattern[1..]) || match_internal(&text[1..], pattern)
            }
        }
        '?' => {
            // exactly one
            !text.is_empty() && match_internal(&text[1..], &pattern[1..])
        }
        '[' => {
            // character set [abc]
            if let Some(end_idx) = pattern.iter().position(|&c| c == ']') {
                let set = &pattern[1..end_idx];
                !text.is_empty() && set.contains(&text[0]) && match_internal(&text[1..], &pattern[end_idx+1..])
            } else {
                // Malformed pattern, treat as literal '['
                !text.is_empty() && text[0] == '[' && match_internal(&text[1..], &pattern[1..])
            }
        }
        _ => {
            // literal match
            !text.is_empty() && text[0] == pattern[0] && match_internal(&text[1..], &pattern[1..])
        }
    }
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
        assert!(!wildcard_match("3m", "3+m")); // RFC says + is one or more *unknown*? 
        // Re-reading RFC: "+" in place of one or more unknown characters.
        // So "3+m" matching "30m" means the "+" matches "0".
        // "3+m" matching "3m" should fail because there is no "unknown" character between 3 and m.
    }

    #[test]
    fn test_should_match_set() {
        assert!(wildcard_match("tank", "t[ao]nk"));
        assert!(wildcard_match("tonk", "t[ao]nk"));
        assert!(!wildcard_match("tenk", "t[ao]nk"));
    }
}
