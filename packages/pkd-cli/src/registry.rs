/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Registry Module)
 * File: packages/pkd-cli/src/registry.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Distribution lifecycle management for the Pharos Registry.
 * Traceability: Issue #126, ADR-0026, ADR-0027, Issue #276
 * ======================================================================== */

use crate::auth::AuthManager;
use crate::models::{PharosEnv, PharosRole};
use anyhow::{anyhow, Result};
use clap::{Args, Subcommand};
use colored::*;
use regex::Regex;
use std::path::PathBuf;

#[derive(Args, Debug)]
pub struct RegistryArgs {
    /// Default target directory for registry output (overrides per-command defaults)
    #[arg(long, env = "PHAROS_REGISTRY_TARGET", global = true)]
    pub registry_target: Option<PathBuf>,

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
        /// Output directory for the compiled artifacts (falls back to --registry-target)
        #[arg(short, long)]
        output: Option<PathBuf>,
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
    /// Generate a manifest.json for all .wasm artifacts in a directory
    GenerateManifest {
        /// The directory containing .wasm artifacts
        path: PathBuf,
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
    /// Perform a supply chain security audit of the monorepo
    Audit,
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

    pub async fn handle(
        &self,
        action: RegistryCommands,
        registry_target: Option<PathBuf>,
    ) -> Result<()> {
        match action {
            RegistryCommands::Bake {
                source,
                output,
                shard_id,
            } => {
                let resolved_output = output.or(registry_target).ok_or_else(|| {
                    anyhow!(
                        "No output directory specified. Provide --output on the bake command \
                         or --registry-target on the registry command (or set PHAROS_REGISTRY_TARGET)."
                    )
                })?;
                self.bake(source, resolved_output, shard_id).await
            }
            RegistryCommands::Verify { path, remote, hash } => {
                self.verify(path, remote, hash).await
            }
            RegistryCommands::GenerateManifest { path } => {
                crate::handle_core_generate_manifest(path).await
            }
            RegistryCommands::Push { source, shard_id } => self.push(source, shard_id).await,
            RegistryCommands::Pulse { env } => self.pulse(env.unwrap_or(self.env)).await,
            RegistryCommands::Audit => self.audit().await,
            RegistryCommands::Status => self.status().await,
        }
    }

    async fn audit(&self) -> Result<()> {
        println!(
            "{} Registry Audit: Starting supply chain watchdog...",
            "ℹ".blue()
        );
        let mut violations = 0;

        // 1. Audit Containerfiles for unpinned images
        violations += self.audit_containerfiles().await?;

        // 2. Audit package.json for prebuild-install and unpinned deps
        violations += self.audit_npm_dependencies().await?;

        // 3. Audit Cargo.toml for unpinned deps
        violations += self.audit_cargo_dependencies().await?;

        if violations > 0 {
            println!(
                "\n{} Supply chain audit failed with {} violations.",
                "✘".red(),
                violations
            );
            Err(anyhow!("Supply chain security standards not met."))
        } else {
            println!(
                "\n{} Supply chain audit passed. Monorepo is secure.",
                "✔".green()
            );
            Ok(())
        }
    }

    async fn audit_containerfiles(&self) -> Result<u32> {
        println!("   [Audit] Verifying Containerfile image pinning (@sha256)...");
        let mut violations = 0;
        let from_regex = Regex::new(r"(?i)^FROM\s+([^\s]+)").unwrap();

        let paths = std::fs::read_dir(".")?;
        for entry in paths {
            let entry = entry?;
            let path = entry.path();
            let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");

            if file_name.starts_with("Containerfile") {
                let content = std::fs::read_to_string(&path)?;
                for line in content.lines() {
                    if let Some(caps) = from_regex.captures(line) {
                        let image = &caps[1];
                        // Ignore local build stages (aliases)
                        if image.contains('/') && !image.contains("@sha256:") {
                            println!(
                                "      {} {}: Unpinned image '{}' (Missing @sha256)",
                                "✘".red(),
                                file_name,
                                image
                            );
                            violations += 1;
                        }
                    }
                }
            }
        }
        Ok(violations)
    }

    async fn audit_npm_dependencies(&self) -> Result<u32> {
        println!("   [Audit] Verifying package.json (prebuild-install & pinning)...");
        let mut violations = 0;

        // Find all package.json files
        let walker = ignore::WalkBuilder::new(".")
            .hidden(false)
            .git_ignore(true)
            .build();

        for entry in walker {
            let entry = entry?;
            let path = entry.path();
            if path.file_name().and_then(|s| s.to_str()) == Some("package.json") {
                if path.to_string_lossy().contains("node_modules") {
                    continue;
                }

                let content = std::fs::read_to_string(path)?;
                let v: serde_json::Value = serde_json::from_str(&content)?;

                if let Some(deps) = v.get("dependencies").and_then(|d| d.as_object()) {
                    violations += self.check_deps(path, deps, "dependency")?;
                }
                if let Some(dev_deps) = v.get("devDependencies").and_then(|d| d.as_object()) {
                    violations += self.check_deps(path, dev_deps, "devDependency")?;
                }
            }
        }
        Ok(violations)
    }

    fn check_deps(
        &self,
        path: &std::path::Path,
        deps: &serde_json::Map<String, serde_json::Value>,
        _type: &str,
    ) -> Result<u32> {
        let mut violations = 0;
        for (name, version) in deps {
            let version_str = version.as_str().unwrap_or("");

            // Prohibited: prebuild-install (Issue #167)
            if name == "prebuild-install" {
                println!(
                    "      {} {}: Deprecated 'prebuild-install' detected (Security Risk)",
                    "✘".red(),
                    path.display()
                );
                violations += 1;
            }

            // Pinning check: No '*' or 'latest'
            if version_str == "*" || version_str == "latest" {
                // Workspace Exception: Internal @pkd packages use '*' for linkage
                if name.starts_with("@pkd/") && version_str == "*" {
                    continue;
                }
                println!(
                    "      {} {}: Unpinned {} '{}' version: {}",
                    "✘".red(),
                    path.display(),
                    _type,
                    name,
                    version_str
                );
                violations += 1;
            }
        }
        Ok(violations)
    }

    async fn audit_cargo_dependencies(&self) -> Result<u32> {
        println!("   [Audit] Verifying Cargo.toml pinning...");
        let mut violations = 0;

        let walker = ignore::WalkBuilder::new(".")
            .hidden(false)
            .git_ignore(true)
            .build();

        for entry in walker {
            let entry = entry?;
            let path = entry.path();
            if path.file_name().and_then(|s| s.to_str()) == Some("Cargo.toml") {
                let content = std::fs::read_to_string(path)?;
                let doc = content.parse::<toml::Value>()?;

                if let Some(deps) = doc.get("dependencies").and_then(|d| d.as_table()) {
                    violations += self.check_cargo_deps(path, deps)?;
                }
                if let Some(dev_deps) = doc.get("dev-dependencies").and_then(|d| d.as_table()) {
                    violations += self.check_cargo_deps(path, dev_deps)?;
                }
                if let Some(target) = doc.get("target").and_then(|t| t.as_table()) {
                    for (_spec, table) in target {
                        if let Some(deps) = table.get("dependencies").and_then(|d| d.as_table()) {
                            violations += self.check_cargo_deps(path, deps)?;
                        }
                    }
                }
            }
        }
        Ok(violations)
    }

    fn check_cargo_deps(&self, path: &std::path::Path, deps: &toml::value::Table) -> Result<u32> {
        let mut violations = 0;
        let critical_ffi = [
            "zstd", "openssl", "sqlite", "rocksdb", "libz-sys", "wasmtime",
        ];

        for (name, version) in deps {
            let version_str = if let Some(s) = version.as_str() {
                s
            } else if let Some(t) = version.as_table() {
                t.get("version").and_then(|v| v.as_str()).unwrap_or("")
            } else {
                ""
            };

            // 1. Prohibit '*' (Loose Pinning)
            if version_str == "*" {
                println!(
                    "      {} {}: Unpinned Cargo dependency '{}' version: {}",
                    "✘".red(),
                    path.display(),
                    name,
                    version_str
                );
                violations += 1;
            }

            // 2. Enforce Exact Pinning (=) for Critical FFI (ADR-0014 Small Stone)
            if critical_ffi.contains(&name.as_str()) && !version_str.starts_with('=') {
                println!(
                    "      {} {}: Critical FFI dependency '{}' requires exact pinning (e.g., '={}'). Found: '{}'",
                    "✘".red(),
                    path.display(),
                    name,
                    version_str,
                    version_str
                );
                violations += 1;
            }
        }
        Ok(violations)
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

    // --- Registry Target Override Tests (Issue #276) ---

    #[tokio::test]
    async fn test_bake_should_use_output_when_both_output_and_registry_target_provided() {
        let auth_mgr = setup_mock_auth(PharosRole::Admin, None);
        let mgr = RegistryManager::new(auth_mgr, PharosEnv::Dev);
        let source_dir = TempDir::new().unwrap();
        let output_dir = TempDir::new().unwrap();
        let target_dir = TempDir::new().unwrap();

        // When both --output and --registry-target are provided, --output wins
        let action = RegistryCommands::Bake {
            source: source_dir.path().to_path_buf(),
            output: Some(output_dir.path().to_path_buf()),
            shard_id: None,
        };

        let result = mgr
            .handle(action, Some(target_dir.path().to_path_buf()))
            .await;
        // Bake succeeds with empty source; artifacts land in output_dir, not target_dir
        assert!(result.is_ok());
        assert!(
            output_dir.path().join("search-index.tar.zst").exists(),
            "Artifacts should be written to --output, not --registry-target"
        );
        assert!(
            !target_dir.path().join("search-index.tar.zst").exists(),
            "--registry-target directory should remain empty when --output is provided"
        );
    }

    #[tokio::test]
    async fn test_bake_should_fallback_to_registry_target_when_output_omitted() {
        let auth_mgr = setup_mock_auth(PharosRole::Admin, None);
        let mgr = RegistryManager::new(auth_mgr, PharosEnv::Dev);
        let source_dir = TempDir::new().unwrap();
        let target_dir = TempDir::new().unwrap();

        let action = RegistryCommands::Bake {
            source: source_dir.path().to_path_buf(),
            output: None,
            shard_id: None,
        };

        let result = mgr
            .handle(action, Some(target_dir.path().to_path_buf()))
            .await;
        // Bake should succeed, writing artifacts into registry-target
        assert!(result.is_ok());
        assert!(
            target_dir.path().join("search-index.tar.zst").exists(),
            "Artifacts should fall back to --registry-target when --output is omitted"
        );
    }

    #[tokio::test]
    async fn test_bake_should_error_when_neither_output_nor_registry_target_provided() {
        let auth_mgr = setup_mock_auth(PharosRole::Admin, None);
        let mgr = RegistryManager::new(auth_mgr, PharosEnv::Dev);
        let source_dir = TempDir::new().unwrap();

        let action = RegistryCommands::Bake {
            source: source_dir.path().to_path_buf(),
            output: None,
            shard_id: None,
        };

        let result = mgr.handle(action, None).await;
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("No output directory specified"),
            "Should fail with clear error when neither --output nor --registry-target is provided"
        );
    }

    // --- Push Authorization Tests ---

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
