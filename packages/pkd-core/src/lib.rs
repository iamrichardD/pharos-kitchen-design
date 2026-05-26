/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Entry
 * File: lib.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Entry point for the pkd-core Rust/WASM engine.
 * Traceability: Issue #9, ADR 0002, #111
 * ======================================================================== */

pub mod bindings;
pub mod geometry;
pub mod lazy_loader;
pub mod models;
pub mod pulse;
pub mod security;
pub mod slices;
pub mod validator;

#[cfg(not(target_arch = "wasm32"))]
pub mod jit;

#[cfg(test)]
pub mod tests;

pub use models::metadata::PharosMetadata;
pub use models::metadata::RegistryShard;
pub use models::schema::PharosSchema;
pub use models::types::ParameterValue;
