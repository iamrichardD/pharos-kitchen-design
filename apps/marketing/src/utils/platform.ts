/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing Site / Utilities
 * File: platform.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Deterministic platform detection logic for the /install route.
 * Traceability: Issue #76, ADR-0006
 * ======================================================================== */

export type Platform = 'linux' | 'windows' | 'macos';

/**
 * Detects the platform based on the user agent string.
 * Defaults to 'linux' as the Pharos primary development platform.
 */
export function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  
  // Order matters: Check Windows first, then Mac (to avoid mobile Mac strings if possible), then default to Linux
  if (ua.includes('win')) {
    return 'windows';
  }
  
  if (ua.includes('mac')) {
    return 'macos';
  }
  
  return 'linux';
}
