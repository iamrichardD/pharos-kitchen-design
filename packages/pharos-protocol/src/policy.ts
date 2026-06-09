/** ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Policy
 * File: packages/pharos-protocol/src/policy.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: TypeScript definitions for the 'Informed Sentinel' contract.
 * Traceability: Issue #204, ADR-0056, ADR-0057
 * Last Updated: 2026-06-09
 * ======================================================================== */

export type PolicyDecision = 
  | { type: 'Allow' }
  | { type: 'Deny', reason: string }
  | { type: 'Challenge', factor: string };

export interface PolicyContext {
  organization_id: string;
  user_id: string;
  resource_id: string;
  action: string;
}
