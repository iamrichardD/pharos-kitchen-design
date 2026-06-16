/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Utilities
 * File: wildcardFilter.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Shared wildcard search matching and query application utilities.
 * Traceability: Issue #242, PR #250
 * Last Updated: 2026-06-15
 * ======================================================================== */

export function matchWildcard(text: string, pattern: string): boolean {
  if (pattern.length > 100) {
    console.warn("[ReDoS Warden] Query pattern length exceeds 100 characters limit.");
    return false;
  }
  const wildcardCount = (pattern.match(/[*+?\[]/g) || []).length;
  if (wildcardCount > 3) {
    console.warn("[ReDoS Warden] Query pattern contains too many wildcard symbols (max 3).");
    return false;
  }
  if (/([*+?]{2,})/.test(pattern)) {
    console.warn("[ReDoS Warden] Query pattern contains pathological contiguous wildcards.");
    return false;
  }

  const startTime = performance.now();
  try {
    const regexPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\+/g, '.+')
      .replace(/\\\?/g, '.')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    const result = regex.test(text);
    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(`[ReDoS Warden] Wildcard match took ${duration.toFixed(2)}ms, exceeding 100ms temporal limit.`);
      return false;
    }
    return result;
  } catch (e) {
    console.error("[ReDoS Warden] Regex compilation failed:", e);
    return false;
  }
}
