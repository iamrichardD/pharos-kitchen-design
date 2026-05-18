/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Tests
 * File: mod.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Index of core tests.
 * Traceability: Issue #111
 * ======================================================================== */

pub mod deserialization;

#[cfg(not(target_arch = "wasm32"))]
pub mod jit_actor;
