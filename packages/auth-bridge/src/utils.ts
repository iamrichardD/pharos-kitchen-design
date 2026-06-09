/** ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Utilities
 * File: src/utils.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Native Web Crypto and binary utilities (Purging Node.js legacy).
 * Traceability: Issue #204, ADR-0050
 * Last Updated: 2026-06-09
 * ======================================================================== */

/**
 * Native, zero-dependency ID generator using Web Crypto.
 * Why: Adheres to the 'Boring Crypto' mandate and purges nodejs_compat.
 */
export function generateId(length: number = 21): string {
  const alphabet = 'useand-6789BCDFGHJKLMNPQRSTVWXYZ_cfghkpqrsatuvwz012345';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

/**
 * Native base64url encoding using Web Standard APIs.
 */
export function toBase64Url(bytes: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Native base64url decoding using Web Standard APIs.
 */
export function fromBase64Url(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binString = atob(padded);
    return Uint8Array.from(binString, (c) => c.charCodeAt(0));
}
