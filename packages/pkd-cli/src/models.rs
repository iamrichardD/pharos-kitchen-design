/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Models)
 * File: packages/pkd-cli/src/models.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Shared data models for the Pharos CLI.
 * Traceability: Issue #12 - Admin Control Plane
 * ======================================================================== */

use clap::ValueEnum;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Clone, Copy, Debug, PartialEq, Eq, ValueEnum, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PharosRole {
    /// Independent Kitchen Designer
    Ikd,
    /// Original Equipment Manufacturer
    Oem,
    /// Virtual Design & Construction Professional
    Vdc,
    /// Platform Administrator
    Admin,
    /// Third-party Compliance Auditor
    Auditor,
    /// Automated Service Agent
    Bot,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, ValueEnum, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum PharosEnv {
    /// Raw Extraction (SQLite)
    Local,
    /// Local Sandbox (.artifacts/)
    Dev,
    /// Pre-release UAT (Staging R2)
    Stage,
    /// Authoritative Truth (Production R2)
    #[default]
    Prod,
}

impl fmt::Display for PharosEnv {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PharosEnv::Local => write!(f, "local"),
            PharosEnv::Dev => write!(f, "dev"),
            PharosEnv::Stage => write!(f, "stage"),
            PharosEnv::Prod => write!(f, "prod"),
        }
    }
}

impl fmt::Display for PharosRole {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PharosRole::Ikd => write!(f, "IKD"),
            PharosRole::Oem => write!(f, "OEM"),
            PharosRole::Vdc => write!(f, "VDC"),
            PharosRole::Admin => write!(f, "ADMIN"),
            PharosRole::Auditor => write!(f, "AUDITOR"),
            PharosRole::Bot => write!(f, "BOT"),
        }
    }
}
