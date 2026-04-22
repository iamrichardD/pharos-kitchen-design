/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Control Plane)
 * File: packages/pkd-cli/src/main.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Entry point for the Pharos CLI (pkd). Implements the Admin-First 
 *          Control Plane strategy defined in ADR-0006.
 * Traceability: Issue #10 - CLI Implementation
 * ======================================================================== */

mod auth;
mod admin;
mod models;
mod guard;
mod bake;

use anyhow::{Result, anyhow};
use clap::{Parser, Subcommand};
use colored::*;
use pkd_core::{PharosSchema, PharosMetadata};
use crate::auth::AuthManager;
use crate::admin::AdminManager;
use crate::models::PharosRole;
use crate::guard::{Guard, Authorizable};
use std::path::PathBuf;

/// Pharos CLI (pkd) - The Admin-First Control Plane for Project Prism.
#[derive(Parser)]
#[command(name = "pkd", version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    /// Override the default Auth Bridge URL
    #[arg(long, env = "PHAROS_AUTH_URL", default_value = "https://auth.iamrichardd.com")]
    auth_url: String,

    /// Positional fallback for RFC 2378 search (e.g., 'pkd manufacturer=3m')
    #[arg(trailing_var_arg = true)]
    query: Vec<String>,
}

#[derive(Subcommand)]
enum Commands {
    /// Authentication and identity management
    Auth {
        #[command(subcommand)]
        action: AuthCommands,
    },
    /// Administrative user and role orchestration
    Admin {
        #[command(subcommand)]
        action: AdminCommands,
    },
    /// Core metadata operations (Bridge to pkd-core)
    Core {
        #[command(subcommand)]
        action: CoreCommands,
    },
    /// Update the pkd binary to the latest version
    SelfUpdate,
}

#[derive(Subcommand)]
enum AuthCommands {
    /// Perform Device Authorization Flow (RFC 8628)
    Login,
    /// Revoke local session and clear keyring
    Logout,
    /// Show current identity and role information
    Whoami,
}

#[derive(Subcommand)]
enum AdminCommands {
    /// Manage users and their Pharos roles
    Users {
        #[command(subcommand)]
        action: UserCommands,
    },
}

impl Authorizable for AdminCommands {
    fn required_roles(&self) -> Vec<PharosRole> {
        match self {
            AdminCommands::Users { .. } => vec![PharosRole::Admin, PharosRole::Auditor],
        }
    }
}

#[derive(Subcommand)]
enum UserCommands {
    /// List all registered users (Cognito Orchestration)
    List,
    /// Update a user's metadata and roles
    Update {
        #[arg(short, long)]
        email: String,
        #[arg(short, long)]
        role: PharosRole,
    },
    /// Impersonate a user for testing (Requires ADMIN/AUDITOR)
    Impersonate {
        #[arg(short, long)]
        email: String,
    },
}

#[derive(Subcommand)]
enum CoreCommands {
    /// Validate a Pharos metadata JSON file
    Validate {
        #[arg(short, long)]
        path: PathBuf,
    },
    /// Search the equipment registry using RFC 2378 query syntax
    Search {
        /// The query string (e.g., 'manufacturer=3m return name')
        query: Vec<String>,
    },
    /// Bake the raw registry into a searchable binary archive
    Bake {
        /// Source directory containing sharded JSON files
        #[arg(short, long)]
        source: PathBuf,
        /// Output directory for the Tantivy index and archive
        #[arg(short, long)]
        output: PathBuf,
    },
    /// Verify the integrity of a baked manifest
    VerifyManifest {
        /// The path to the file to verify
        path: PathBuf,
        /// The expected SHA-256 hash
        hash: String,
    },
    /// Promote local artifacts to the production CDN (Cloudflare R2)
    Promote {
        /// The environment to promote to
        #[arg(short, long, default_value = "prod")]
        env: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let auth_mgr = AuthManager::new(&cli.auth_url);
    let admin_mgr = AdminManager::new(&cli.auth_url, auth_mgr.clone());

    match cli.command {
        Some(command) => match command {
            Commands::Auth { action } => match action {
                AuthCommands::Login => {
                    auth_mgr.login().await?;
                }
                AuthCommands::Logout => {
                    auth_mgr.logout()?;
                }
                AuthCommands::Whoami => {
                    auth_mgr.whoami()?;
                }
            },
            Commands::Admin { action } => {
                // Fail Fast: Ensure user has sufficient permissions for Admin commands
                // Decoupled Policy: Enforced by the Authorizable trait (ADR-0017)
                Guard::enforce(&auth_mgr, &action)?;

                match action {
                    AdminCommands::Users { action } => match action {
                        UserCommands::List => {
                            admin_mgr.list_users().await?;
                        }
                        UserCommands::Update { email, role } => {
                            admin_mgr.update_user(&email, role).await?;
                        }
                        UserCommands::Impersonate { email } => {
                            admin_mgr.impersonate(&email)?;
                        }
                    },
                }
            }
            Commands::Core { action } => match action {
                CoreCommands::Validate { path } => {
                    handle_core_validate(path).await?;
                }
                CoreCommands::Search { query } => {
                    handle_core_search(query).await?;
                }
                CoreCommands::Bake { source, output } => {
                    handle_core_bake(source, output).await?;
                }
                CoreCommands::VerifyManifest { path, hash } => {
                    handle_core_verify_manifest(path, hash).await?;
                }
                CoreCommands::Promote { env } => {
                    handle_core_promote(env).await?;
                }
            },
            Commands::SelfUpdate => {
                handle_self_update().await?;
            }
        },
        None => {
            // Task 2: Positional Fallback (ADR 0006)
            // If no subcommand is provided but query parts exist, default to 'core search'
            if !cli.query.is_empty() {
                handle_core_search(cli.query).await?;
            } else {
                // No command and no query: show help
                use clap::CommandFactory;
                Cli::command().print_help()?;
            }
        }
    }

    Ok(())
}

async fn handle_core_validate(path: PathBuf) -> Result<()> {
    println!("{} Validating metadata at {:?}...", "ℹ".blue(), path);
    let content = std::fs::read_to_string(&path)?;
    let metadata: PharosMetadata = serde_json::from_str(&content)?;
    
    // Load schema from embedded or local file (using embedded for now)
    let schema_json = include_str!("../../pkd-core/schema/pharos-schema.json");
    let schema: PharosSchema = serde_json::from_str(schema_json)?;

    match pkd_core::validator::SchemaValidator::validate_metadata(&schema, &metadata) {
        Ok(_) => println!("{} Metadata is valid and compliant.", "✔".green()),
        Err(errors) => {
            println!("{} Validation failed with {} errors:", "✘".red(), errors.len());
            for err in errors {
                println!("  - {}", err.to_string().yellow());
            }
            return Err(anyhow!("Validation failed"));
        }
    }
    Ok(())
}

async fn handle_core_search(query_parts: Vec<String>) -> Result<()> {
    if query_parts.is_empty() {
        return Err(anyhow!("Search query is empty. Example: pkd core search manufacturer=3m"));
    }

    let raw_query = query_parts.join(" ");
    
    // 1. Fail Fast: Parse the query using the shared pharos-protocol library
    let command = pharos_protocol::parse_command(&format!("query {}", raw_query))
        .map_err(|e| anyhow!("Failed to parse query syntax: {}", e))?;

    if let pharos_protocol::Command::Query { selections, returns } = command {
        // 2. Fail Fast: Validate all selection fields against RFC 2378 attributes in schema
        let schema_json = include_str!("../../pkd-core/schema/pharos-schema.json");
        let schema: PharosSchema = serde_json::from_str(schema_json)?;

        for (field_opt, _) in &selections {
            if let Some(field) = field_opt {
                let shared_param = schema.parameter_standards.shared_parameters.get(field)
                    .ok_or_else(|| anyhow!("Field '{}' is not defined in the Pharos schema.", field))?;

                if !shared_param.is_lookup() {
                    return Err(anyhow!(
                        "Field failure: '{}' is not marked as a 'Lookup' field. Search prohibited by ADR 0023.", 
                        field
                    ));
                }
            }
        }

        println!("{} Executing registry search...", "ℹ".blue());
        println!("{} Query:   {}", "  -".blue(), raw_query.cyan());
        if !returns.is_empty() {
            println!("{} Returns: {}", "  -".blue(), returns.join(", ").yellow());
        }
        
        // (Actual registry search via API will be implemented in a later sprint)
        println!("\n{} Search syntax is valid and compliant with RFC 2378.", "✔".green());
    }

    Ok(())
}

async fn handle_core_bake(source: PathBuf, output: PathBuf) -> Result<()> {
    let engine = bake::BakeEngine::new();
    engine.run(&source, &output).await
}

async fn handle_core_verify_manifest(path: PathBuf, hash: String) -> Result<()> {
    println!("{} Verifying manifest integrity...", "ℹ".blue());
    println!("{} Path: {}", "  -".blue(), path.display().to_string().cyan());
    println!("{} Hash: {}", "  -".blue(), hash.yellow());

    match pkd_core::security::verify_manifest(&path, &hash) {
        Ok(_) => {
            println!("\n{} Verification successful. Artifact is structurally sound.", "✔".green());
            Ok(())
        }
        Err(e) => {
            println!("\n{} Verification failed: {}", "✘".red(), e.to_string().yellow());
            Err(anyhow!("Integrity violation detected."))
        }
    }
}

async fn handle_core_promote(env: String) -> Result<()> {
    println!("{} Scaffolding promotion to {}...", "ℹ".blue(), env.cyan());
    println!("{} Note: Actual Cloudflare R2 upload logic will be implemented in Issue #55.", "⚠".yellow());
    Ok(())
}

async fn handle_self_update() -> Result<()> {
    println!("{} Checking for updates on GitHub...", "ℹ".blue());
    
    let status = self_update::backends::github::Update::configure()
        .repo_owner("iamrichardd")
        .repo_name("pharos-kitchen-design")
        .bin_name("pkd")
        .show_download_progress(true)
        .current_version(env!("CARGO_PKG_VERSION"))
        .build()?
        .update()?;

    if status.updated() {
        println!("{} Updated to version {}!", "✔".green(), status.version());
    } else {
        println!("{} Already up-to-date (v{}).", "✔".green(), env!("CARGO_PKG_VERSION"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::Parser;

    #[test]
    fn test_should_fallback_to_search_when_no_subcommand_provided() {
        // Simulate 'pkd manufacturer=3m'
        let args = vec!["pkd", "manufacturer=3m"];
        let cli = Cli::try_parse_from(args).unwrap();
        
        assert!(cli.command.is_none());
        assert_eq!(cli.query, vec!["manufacturer=3m".to_string()]);
    }

    #[test]
    fn test_should_prefer_subcommand_over_query() {
        // Simulate 'pkd auth login'
        let args = vec!["pkd", "auth", "login"];
        let cli = Cli::try_parse_from(args).unwrap();
        
        match cli.command {
            Some(Commands::Auth { action: AuthCommands::Login }) => (),
            _ => panic!("Expected Auth Login subcommand"),
        }
        assert!(cli.query.is_empty());
    }
}
