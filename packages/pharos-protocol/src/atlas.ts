/** ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Atlas
 * File: packages/pharos-protocol/src/atlas.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Authoritative prefix-to-shard mapping for lazy loading.
 * Traceability: Issue #204, ADR-0057
 * Last Updated: 2026-06-10
 * ======================================================================== */

export const SHARD_ATLAS: Record<string, string> = {
  'refrigeration:': 'refrigeration.bin',
  'warewashing:': 'warewashing.bin',
  'cooking:': 'cooking.bin',
  'preparation:': 'preparation.bin',
};

/**
 * Resolves a resource prefix to its authoritative shard filename.
 */
export function resolveShard(prefix: string): string | null {
  return SHARD_ATLAS[prefix] || null;
}
