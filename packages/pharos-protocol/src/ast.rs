/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/ast.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Abstract Syntax Tree (AST) definitions for RFC 2378 commands.
 * Traceability: ADR 0024, RFC 2378 Section 3
 * ======================================================================== */

use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, Clone)]
pub enum SelectionFilter {
    Single(Option<String>, String),
    And(Vec<SelectionFilter>),
    Or(Vec<SelectionFilter>),
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, Clone)]
pub enum Command {
    Status,
    SiteInfo,
    Fields(Vec<String>),
    Id(String),
    Set(Vec<String>),
    Login(String),
    Logout,
    Answer(String),
    Clear(String),
    Email(String),
    XLogin(u32, String),
    Add(Vec<(String, String)>),
    Query {
        selections: SelectionFilter,
        returns: Vec<String>,
    },
    Delete(SelectionFilter),
    Change {
        selections: SelectionFilter,
        modifications: Vec<(String, String)>,
        force: bool,
    },
    Help {
        target: Option<String>,
        topics: Vec<String>,
    },
    /// Pharos Extension: SSH-key authentication
    Auth {
        public_key: String,
        signature: String,
    },
    /// Pharos Extension: Challenge verification
    AuthCheck {
        public_key: String,
        signature: String,
        challenge: String,
    },
    Quit,
}
