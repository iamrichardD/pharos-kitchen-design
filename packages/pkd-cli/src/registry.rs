/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Registry Module)
 * File: packages/pkd-cli/src/registry.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Distribution lifecycle management for the Pharos Registry.
 * Traceability: Issue #126, ADR-0026, ADR-0027
 * ======================================================================== */

use crate::auth::AuthManager;
use crate::models::{PharosEnv, PharosRole};
use anyhow::{anyhow, Result};
use clap::{Args, Subcommand};
use colored::*;
use std::path::PathBuf;

#[derive(Args, Debug)]
pub struct RegistryArgs {
    #[command(subcommand)]
    pub action: RegistryCommands,
}

#[derive(Subcommand, Debug)]
pub enum RegistryCommands {
    /// Bake raw JSON shards into a searchable archive
    Bake {
        /// Source directory containing sharded JSON files
        #[arg(short, long)]
        source: PathBuf,
        /// Output directory for the compiled artifacts
        #[arg(short, long)]
        output: PathBuf,
        /// Optional shard-id for incremental baking
        #[arg(long)]
        shard_id: Option<String>,
    },
    /// Verify the cryptographic integrity of local or remote artifacts
    Verify {
        /// Local path to verify
        #[arg(short, long)]
        path: PathBuf,
        /// Check authoritative manifest on the remote CDN
        #[arg(long)]
        remote: bool,
        /// Expected SHA-256 hash (overrides manifest check)
        #[arg(long)]
        hash: Option<String>,
    },
    /// Promote baked artifacts to a remote realm (Dev, Stage, Prod)
    Push {
        /// The directory containing the baked archive
        #[arg(short, long)]
        source: PathBuf,
        /// The specific shard-id being pushed
        #[arg(long)]
        shard_id: String,
    },
    /// High-rigor system health and synchronization check
    Pulse {
        /// Target environment (realm)
        #[arg(short, long)]
        env: Option<PharosEnv>,
    },
    /// Diagnostic output of the current registry state
    Status,
}

pub struct RegistryManager {
    auth_mgr: AuthManager,
    env: PharosEnv,
}

impl RegistryManager {
    pub fn new(auth_mgr: AuthManager, env: PharosEnv) -> Self {
        Self { auth_mgr, env }
    }

    pub async fn handle(&self, action: RegistryCommands) -> Result<()> {
        match action {
            RegistryCommands::Bake {
                source,
                output,
                shard_id,
            } => self.bake(source, output, shard_id).await,
            RegistryCommands::Verify { path, remote, hash } => {
                self.verify(path, remote, hash).await
            }
            RegistryCommands::Push { source, shard_id } => self.push(source, shard_id).await,
            RegistryCommands::Pulse { env } => self.pulse(env.unwrap_or(self.env)).await,
            RegistryCommands::Status => self.status().await,
        }
    }

    async fn bake(&self, source: PathBuf, output: PathBuf, shard_id: Option<String>) -> Result<()> {
        println!("{} Registry Bake: Starting engine...", "ℹ".blue());
        if let Some(ref id) = shard_id {
            println!("{} Filtering for shard-id: {}", "  -".blue(), id.cyan());
        }

        let engine = crate::bake::BakeEngine::new();
        engine.run_incremental(&source, &output, shard_id).await
    }

    async fn verify(&self, path: PathBuf, remote: bool, hash: Option<String>) -> Result<()> {
        if remote {
            println!(
                "{} Registry Verify: Checking remote CDN manifest...",
                "ℹ".blue()
            );
            println!(
                "{} Note: Remote verification logic will be completed in Phase 3.",
                "⚠".yellow()
            );
            Ok(())
        } else {
            crate::handle_core_verify_manifest(path, hash).await
        }
    }

    async fn push(&self, _source: PathBuf, shard_id: String) -> Result<()> {
        println!(
            "{} Registry Push: Verifying authority for {}...",
            "ℹ".blue(),
            shard_id.cyan()
        );

        // 1. Organization Sentinel (ADR-0027)
        let current_org = self.auth_mgr.get_current_organization()?;
        let current_role = self.auth_mgr.get_current_role()?;

        match (current_role, current_org) {
            (Some(PharosRole::Admin), _) => {
                println!("{} Authority confirmed via ADMIN role.", "✔".green());
            }
            (Some(PharosRole::Oem), Some(org)) => {
                // OEMs can push to shards that exactly match their org name or start with {org}-
                if org == shard_id || shard_id.starts_with(&format!("{}-", org)) {
                    println!(
                        "{} Authority confirmed for organization: {}",
                        "✔".green(),
                        org.yellow()
                    );
                } else {
                    println!("{} Security Violation: Organization '{}' attempted to push to unauthorized shard '{}'.", "✘".red(), org, shard_id);
                    return Err(anyhow!(
                        "Security Violation: Organization '{}' is not authorized to push to shard '{}'.",
                        org,
                        shard_id
                    ));
                }
            }
            (Some(role), _) => {
                println!(
                    "{} Security Violation: Role '{}' is not authorized to push to the registry.",
                    "✘".red(),
                    role
                );
                return Err(anyhow!(
                    "Security Violation: Role '{}' is not authorized to push to the registry.",
                    role
                ));
            }
            _ => {
                return Err(anyhow!("Security Violation: Insufficient permissions (not authenticated or missing role)."));
            }
        }

        println!(
            "{} Promotion of shard '{}' to {} realm initiated...",
            "ℹ".blue(),
            shard_id.cyan(),
            self.env.to_string().cyan()
        );

        // TODO: Implement actual Cloudflare R2 upload using aws-sdk-s3 (Issue #55)
        println!(
            "{} Note: Actual Cloudflare R2 upload logic will be implemented in Issue #55.",
            "⚠".yellow()
        );

        println!("{} Registry Push complete.", "✔".green());
        Ok(())
    }

    async fn pulse(&self, env: PharosEnv) -> Result<()> {
        println!(
            "{} Registry Pulse: Synchronizing with {}...",
            "ℹ".blue(),
            env.to_string().cyan()
        );
        crate::handle_core_pulse().await
    }

    async fn status(&self) -> Result<()> {
        println!("\n{} Pharos Registry Status", "🚀".bold());
        println!(
            "{} Environment: {}",
            "  -".blue(),
            self.env.to_string().cyan()
        );

        if let Ok(Some(org)) = self.auth_mgr.get_current_organization() {
            println!("{} Organization: {}", "  -".blue(), org.yellow());
        }

        if let Ok(Some(scope)) = self.auth_mgr.get_current_scope() {
            println!("{} Authority:    {}", "  -".blue(), scope.green());
        }

        let cache_dir = crate::config::PathResolver::resolve_cache_dir(self.env)?;
        println!(
            "{} Cache Path:  {}",
            "  -".blue(),
            cache_dir.display().to_string().yellow()
        );

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::AuthManager;
    use crate::models::{PharosEnv, PharosRole};
    use tempfile::TempDir;

    fn setup_mock_auth(role: PharosRole, org: Option<&str>) -> AuthManager {
        // Construct mock token with desired claims
        let org_val = org.unwrap_or("NONE");
        let claims = serde_json::json!({
            "sub": "123",
            "email": "test@example.com",
            "custom:role": role.to_string(),
            "custom:organization": org_val,
            "custom:scope": "LOCAL",
            "exp": 9999999999u64
        });

        use base64::{engine::general_purpose, Engine as _};
        let payload =
            general_purpose::URL_SAFE_NO_PAD.encode(serde_json::to_string(&claims).unwrap());
        let mock_token = format!("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{}.signature", payload);

        AuthManager::new("http://localhost", PharosEnv::Dev)
            .with_mock_token("access_token", "acc")
            .with_mock_token("id_token", &mock_token)
    }

    #[tokio::test]
    async fn test_should_allow_push_when_admin_authenticated() {
        let auth_mgr = setup_mock_auth(PharosRole::Admin, None);
        let mgr = RegistryManager::new(auth_mgr, PharosEnv::Dev);
        let temp_dir = TempDir::new().unwrap();

        let result = mgr
            .push(temp_dir.path().to_path_buf(), "ANY_SHARD".to_string())
            .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_should_allow_push_when_oem_matches_shard_id() {
        let auth_mgr = setup_mock_auth(PharosRole::Oem, Some("FRYMASTER"));
        let mgr = RegistryManager::new(auth_mgr, PharosEnv::Dev);
        let temp_dir = TempDir::new().unwrap();

        let result = mgr
            .push(temp_dir.path().to_path_buf(), "FRYMASTER".to_string())
            .await;
        assert!(result.is_ok());

        let result_prefix = mgr
            .push(temp_dir.path().to_path_buf(), "FRYMASTER-V1".to_string())
            .await;

        assert!(result_prefix.is_ok());
    }

    #[tokio::test]
    async fn test_should_reject_push_when_oem_organization_mismatch() {
        let auth_mgr = setup_mock_auth(PharosRole::Oem, Some("FRYMASTER"));
        let mgr = RegistryManager::new(auth_mgr, PharosEnv::Dev);
        let temp_dir = TempDir::new().unwrap();

        let result = mgr
            .push(temp_dir.path().to_path_buf(), "VULCAN".to_string())
            .await;

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Security Violation"));
    }

    #[tokio::test]
    async fn test_should_reject_push_when_role_is_ikd() {
        let auth_mgr = setup_mock_auth(PharosRole::Ikd, None);
        let mgr = RegistryManager::new(auth_mgr, PharosEnv::Dev);
        let temp_dir = TempDir::new().unwrap();

        let result = mgr
            .push(temp_dir.path().to_path_buf(), "ANY_SHARD".to_string())
            .await;

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Security Violation"));
    }
}
