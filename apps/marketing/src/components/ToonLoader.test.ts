/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / UI / Tests
 * File: apps/marketing/src/components/ToonLoader.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic unit tests for ToonLoader date formatting logic (TDD).
 * Traceability: Date formatting localization verification
 * ======================================================================== */

import { describe, it, expect } from 'vitest';

function formatDate(rawDate: string | undefined): string {
  let formattedDate = '2026-XX-XX';
  if (rawDate) {
    try {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        formattedDate = parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } else {
        formattedDate = rawDate;
      }
    } catch (e) {
      formattedDate = rawDate;
    }
  }
  return formattedDate;
}

describe('ToonLoader Date Localization', () => {
  it('test_should_format_date_correctly_when_valid_iso_string', () => {
    expect(formatDate('2026-06-19')).toBe('June 19, 2026');
  });

  it('test_should_fallback_to_raw_when_invalid_date_string', () => {
    expect(formatDate('invalid-date')).toBe('invalid-date');
  });

  it('test_should_return_placeholder_when_date_is_undefined', () => {
    expect(formatDate(undefined)).toBe('2026-XX-XX');
  });
});
