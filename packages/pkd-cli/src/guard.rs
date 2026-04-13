/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Guard Module)
 * File: packages/pkd-cli/src/guard.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Decoupled role-based access control (RBAC) using the 
 *          Authorizable trait.
 * Traceability: Issue #15 - Guard Refactor
 * ======================================================================== */

use anyhow::{Result, anyhow};
use crate::auth::AuthManager;
use crate::models::PharosRole;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GuardError {
    #[error("Authentication required: Please run `pkd auth login` to begin.")]
    Unauthenticated,
    #[error("Unauthorized: Your current role ({0}) does not have permission for this command.")]
    Unauthorized(PharosRole),
    #[error("Auth Bridge failure: {0}")]
    BridgeFailure(String),
}

/// A trait for commands that require specific authorization policies.
/// 
/// Why: Shifts the responsibility of defining access control from the 
///      main dispatcher to the individual command slices (SRP/OCP).
pub trait Authorizable {
    /// Returns the list of roles permitted to execute this command.
    /// An empty vector implies a public/unrestricted command.
    fn required_roles(&self) -> Vec<PharosRole>;
}

pub struct Guard;

impl Guard {
    /// Enforces the authorization policy for a given command.
    /// 
    /// Fail Fast: Immediately returns a structured error if the session 
    ///            does not meet the command's requirements.
    pub fn enforce<T: Authorizable>(auth: &AuthManager, cmd: &T) -> Result<()> {
        let allowed_roles = cmd.required_roles();
        if allowed_roles.is_empty() {
            return Ok(());
        }

        let current_role = auth.get_current_role()
            .map_err(|e| anyhow!(GuardError::BridgeFailure(e.to_string())))?;

        match current_role {
            Some(role) => {
                if allowed_roles.contains(&role) {
                    Ok(())
                } else {
                    Err(anyhow!(GuardError::Unauthorized(role)))
                }
            }
            None => Err(anyhow!(GuardError::Unauthenticated)),
        }
    }
}

#[cfg(test)]
mod tests {
    // (Actual mocking of AuthManager is deferred to integration tests due to its complexity)
}
