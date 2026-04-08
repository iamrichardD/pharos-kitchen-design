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

use anyhow::Result;
use clap::{Parser, Subcommand, ValueEnum};
use colored::*;
use std::fmt;
use crate::auth::AuthManager;

/// Pharos CLI (pkd) - The Admin-First Control Plane for Project Prism.
#[derive(Parser)]
#[command(name = "pkd", version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Override the default Auth Bridge URL
    #[arg(long, env = "PHAROS_AUTH_URL", default_value = "https://auth.iamrichardd.com")]
    auth_url: String,
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
        path: std::path::PathBuf,
    },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, ValueEnum)]
enum PharosRole {
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

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let auth_mgr = AuthManager::new(&cli.auth_url);

    match cli.command {
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
        Commands::Admin { action } => match action {
            AdminCommands::Users { action } => match action {
                UserCommands::List => {
                    println!("{} Fetching user list from Cognito...", "ℹ".blue());
                }
                UserCommands::Update { email, role } => {
                    println!("{} Updating {} to role: {}...", "ℹ".blue(), email.bold(), role.to_string().green());
                }
                UserCommands::Impersonate { email } => {
                    println!("{} Preparing impersonation for {}...", "ℹ".blue(), email.bold());
                }
            },
        },
        Commands::Core { action } => match action {
            CoreCommands::Validate { path } => {
                println!("{} Validating metadata at {:?}...", "ℹ".blue(), path);
                // This will eventually call pkd-core logic
            }
        },
        Commands::SelfUpdate => {
            handle_self_update().await?;
        }
    }

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
