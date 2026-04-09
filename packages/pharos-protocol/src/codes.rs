/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/codes.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Semantic mapping of RFC 2378 numeric result codes.
 * Traceability: ADR 0024, RFC 2378 Appendix B
 * ======================================================================== */

pub const IN_PROGRESS: u16 = 100;
pub const SUCCESS: u16 = 200;
pub const MORE_INFO: u16 = 300;
pub const TEMP_FAILURE: u16 = 400;
pub const PERM_FAILURE: u16 = 500;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum ResponseCategory {
    InProgress,
    Success,
    MoreInfo,
    TemporaryFailure,
    PermanentFailure,
    Unknown,
}

impl ResponseCategory {
    pub fn from_code(code: u16) -> Self {
        match code / 100 {
            1 => ResponseCategory::InProgress,
            2 => ResponseCategory::Success,
            3 => ResponseCategory::MoreInfo,
            4 => ResponseCategory::TemporaryFailure,
            5 => ResponseCategory::PermanentFailure,
            _ => ResponseCategory::Unknown,
        }
    }
}

pub mod codes {
    pub const OK: u16 = 200;
    pub const DATABASE_READY_READ_ONLY: u16 = 201;
    pub const NO_MATCHES: u16 = 501;
    pub const TOO_MANY_MATCHES: u16 = 502;
    pub const NOT_AUTHORIZED: u16 = 503;
    pub const FIELD_DOES_NOT_EXIST: u16 = 507;
    pub const COMMAND_UNKNOWN: u16 = 598;
    pub const SYNTAX_ERROR: u16 = 599;
}
