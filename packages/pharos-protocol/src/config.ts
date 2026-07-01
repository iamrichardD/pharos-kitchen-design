/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Config
 * File: packages/pharos-protocol/src/config.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Centralized environment-aware configuration and URL resolution.
 * Traceability: Closes #312 (Production Redirect Authentication Resolution)
 * Last Updated: 2026-07-01
 * ======================================================================== */

/**
 * Returns the authoritative authentication endpoint URL based on the environment.
 * In production (checking environment variables or hostname), returns the secure production endpoint.
 * In development/local environments, defaults to the local Cloudflare wrangler dev server endpoint.
 */
export function getAuthEndpoint(): string {
  // Safe window environment detection
  const hasWindow = typeof window !== 'undefined' && window.location;
  const isProductionHostname = hasWindow && window.location.hostname === 'iamrichardd.com';
  
  // Safe process environment detection via globalThis/global lookup to prevent TS compilation errors
  const globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  const globalProcess = (globalObj as any)['process'];
  const globalEnv = globalProcess?.env;
  const isProductionEnv = globalEnv?.NODE_ENV === 'production';

  if (isProductionHostname || isProductionEnv) {
    return 'https://iamrichardd.com/pharos-kitchen-design/api/auth';
  }

  return 'http://localhost:8787';
}
