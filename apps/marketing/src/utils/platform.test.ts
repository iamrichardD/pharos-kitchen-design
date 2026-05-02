/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing Site / Utilities / Tests
 * File: platform.spec.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unit tests for deterministic platform detection.
 * Traceability: Issue #76, ADR-0006
 * ======================================================================== */

import { describe, it, expect } from 'vitest';
import { detectPlatform } from './platform';

describe('platform utility', () => {
  it('test_should_detect_windows_when_ua_contains_win', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    expect(detectPlatform(ua)).toBe('windows');
  });

  it('test_should_detect_macos_when_ua_contains_mac', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    expect(detectPlatform(ua)).toBe('macos');
  });

  it('test_should_detect_linux_when_ua_contains_linux', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
    expect(detectPlatform(ua)).toBe('linux');
  });

  it('test_should_fallback_to_linux_when_ua_is_unknown', () => {
    const ua = 'Mozilla/5.0 (Mobile; rv:48.0) Gecko/48.0 Firefox/48.0';
    expect(detectPlatform(ua)).toBe('linux'); 
  });
  
  it('test_should_fallback_to_linux_when_ua_is_empty', () => {
    expect(detectPlatform('')).toBe('linux');
  });
});
