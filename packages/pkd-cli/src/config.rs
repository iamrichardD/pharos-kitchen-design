/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Configuration)
 * File: packages/pkd-cli/src/config.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Environment-aware path resolution and configuration management.
 * Traceability: Issue #51 - Task 4.14
 * ======================================================================== */

use std::path::PathBuf;
use crate::models::PharosEnv;
use anyhow::{Result, anyhow};

pub struct PathResolver;

impl PathResolver {
    /// Resolves the cache directory for the given environment.
    ///
    /// Why: Adheres to ADR-0026, ensuring that 'prod' data is isolated in XDG 
    /// paths while 'dev/stage' can reside in project-relative artifacts to 
    /// facilitate rapid testing without polluting the user's home directory.
    pub fn resolve_cache_dir(env: PharosEnv) -> Result<PathBuf> {
        match env {
            PharosEnv::Prod => {
                let cache_dir = dirs::cache_dir()
                    .ok_or_else(|| anyhow!("Could not find system cache directory"))?;
                Ok(cache_dir.join("pharos").join("prod"))
            }
            PharosEnv::Stage => {
                let cache_dir = dirs::cache_dir()
                    .ok_or_else(|| anyhow!("Could not find system cache directory"))?;
                Ok(cache_dir.join("pharos").join("stage"))
            }
            PharosEnv::Dev => {
                // Project-relative for dev
                let mut path = std::env::current_dir()?;
                path.push(".artifacts");
                path.push("registry");
                Ok(path)
            }
            PharosEnv::Local => {
                let mut path = std::env::current_dir()?;
                path.push("data");
                path.push("raw");
                Ok(path)
            }
        }
    }

    /// Resolves the configuration directory for the given environment.
    ///
    /// Why: Adheres to XDG standards by using config_dir() instead of cluttering 
    /// the user's HOME. Isolates administrative context per environment to 
    /// prevent session leakage.
    pub fn resolve_config_dir(env: PharosEnv) -> Result<PathBuf> {
        let base_dir = dirs::config_dir()
            .ok_or_else(|| anyhow!("Could not find system config directory"))?;
        
        let path = match env {
            PharosEnv::Prod => base_dir.join("pharos"),
            _ => base_dir.join("pharos").join(env.to_string()),
        };
        
        if !path.exists() {
            std::fs::create_dir_all(&path)?;
        }
        
        Ok(path)
    }

    /// Resolves the Auth Bridge URL based on the environment.
    pub fn resolve_auth_url(env: PharosEnv, override_url: Option<String>) -> String {
        if let Some(url) = override_url {
            return url;
        }

        match env {
            PharosEnv::Prod => "https://auth.iamrichardd.com".to_string(),
            PharosEnv::Stage => "https://auth-stage.iamrichardd.com".to_string(),
            PharosEnv::Dev | PharosEnv::Local => "http://localhost:8787".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Why: Verifies that production data is correctly routed to authoritative 
    /// system paths, maintaining host-system governance.
    #[test]
    fn test_should_resolve_xdg_cache_path_when_env_is_prod() {
        let result = PathResolver::resolve_cache_dir(PharosEnv::Prod);
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("pharos"));
        assert!(path.to_string_lossy().contains("prod"));
    }

    /// Why: Ensures that development artifacts remain sandboxed in the project 
    /// root, enabling "Zero-Host" iteration without impacting the local user.
    #[test]
    fn test_should_resolve_local_artifacts_path_when_env_is_dev() {
        let result = PathResolver::resolve_cache_dir(PharosEnv::Dev);
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains(".artifacts"));
    }

    /// Why: Verifies XDG compliance for administrative configuration storage.
    #[test]
    fn test_should_resolve_config_dir_when_env_is_prod() {
        let result = PathResolver::resolve_config_dir(PharosEnv::Prod);
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("pharos"));
    }
}
