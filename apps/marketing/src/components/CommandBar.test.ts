/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / UI / Tests
 * File: CommandBar.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1
 * Purpose: Atomic unit tests for RFC-2378 filter logic (Kent Beck/Crucible #215).
 * ======================================================================== */

import { describe, it, expect } from 'vitest';

// Simple implementation of the logic from CommandBar.astro for node testing
function matchWildcard(text: string, pattern: string) {
  let regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\+/g, '.+')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(text);
}

describe('CommandBar RFC-2378 Filter Logic', () => {
  describe('matchWildcard', () => {
    it('test_should_match_asterisk_wildcard_when_zero_chars', () => {
      expect(matchWildcard('auth', 'auth*')).toBe(true);
    });

    it('test_should_match_asterisk_wildcard_when_multiple_chars', () => {
      expect(matchWildcard('authentication', 'auth*')).toBe(true);
    });

    it('test_should_match_plus_wildcard_when_one_or_more_chars', () => {
      expect(matchWildcard('auth', 'aut+')).toBe(true);
      expect(matchWildcard('aut', 'aut+')).toBe(false);
    });

    it('test_should_match_question_mark_when_exactly_one_char', () => {
      expect(matchWildcard('sprint', 'spr?nt')).toBe(true);
      expect(matchWildcard('sprnt', 'spr?nt')).toBe(false);
    });

    it('test_should_match_brackets_set_when_char_in_set', () => {
      expect(matchWildcard('gray', 'gr[ae]y')).toBe(true);
      expect(matchWildcard('grey', 'gr[ae]y')).toBe(true);
      expect(matchWildcard('grxy', 'gr[ae]y')).toBe(false);
    });
  });
});
