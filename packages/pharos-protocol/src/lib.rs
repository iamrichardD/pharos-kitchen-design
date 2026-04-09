/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/lib.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Entry point for the shared Pharos (RFC 2378) protocol library.
 * Traceability: ADR 0024
 * ======================================================================== */

pub mod ast;
pub mod codes;
pub mod format;
pub mod lexer;
pub mod parser;
pub mod wildcard;

pub use ast::Command;
pub use lexer::tokenize;
pub use parser::{parse_command, ProtocolError};
pub use wildcard::wildcard_match;
