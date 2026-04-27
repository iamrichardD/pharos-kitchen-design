/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Admin Module)
 * File: packages/pkd-cli/src/admin.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Administrative user orchestration and impersonation logic.
 * Traceability: Issue #12 - Admin Control Plane, ADR 0023
 * ======================================================================== */

use anyhow::{Result, anyhow};
use reqwest::{Client, RequestBuilder};
use serde::{Deserialize, Serialize};
use colored::*;
use std::fs;
use std::path::PathBuf;
use crate::models::{PharosRole, PharosEnv};
use crate::auth::AuthManager;
use crate::config::PathResolver;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub username: String,
    pub status: String,
    pub attributes: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UserListResponse {
    users: Vec<User>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct LocalContext {
    impersonated_user: Option<String>,
}

/// Implementation of the Pharos Admin Control Plane client.
/// 
/// Purpose: Orchestrates administrative actions via the Identity Bridge, 
/// ensuring that platform-wide role assignments and metadata updates 
/// are strictly audited and performed only by authorized administrators.
pub struct AdminManager {
    client: Client,
    base_url: String,
    auth_mgr: AuthManager,
    env: PharosEnv,
    context_path: Option<PathBuf>,
}

impl AdminManager {
    pub fn new(base_url: &str, auth_mgr: AuthManager, env: PharosEnv) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.to_string(),
            auth_mgr,
            env,
            context_path: None,
        }
    }

    /// Allows overriding the context path for testing isolation.
    pub fn with_context_path(mut self, path: PathBuf) -> Self {
        self.context_path = Some(path);
        self
    }

    fn get_context_path(&self) -> Result<PathBuf> {
        if let Some(ref p) = self.context_path {
            return Ok(p.clone());
        }
        
        let config_dir = PathResolver::resolve_config_dir(self.env)?;
        Ok(config_dir.join(".pkd_context"))
    }

    fn load_context(&self) -> LocalContext {
        let path = self.get_context_path().ok();
        if let Some(p) = path {
            if let Ok(content) = fs::read_to_string(p) {
                return serde_json::from_str(&content).unwrap_or_default();
            }
        }
        LocalContext::default()
    }

    fn save_context(&self, ctx: &LocalContext) -> Result<()> {
        let path = self.get_context_path()?;
        let content = serde_json::to_string(ctx)?;
        fs::write(path, content)?;
        Ok(())
    }

    /// Helper to inject impersonation header if present in local context.
    fn inject_auth(&self, mut rb: RequestBuilder) -> Result<RequestBuilder> {
        let token = self.auth_mgr.get_token()?;
        rb = rb.bearer_auth(token);

        let ctx = self.load_context();
        if let Some(user) = ctx.impersonated_user {
            rb = rb.header("X-Pharos-Impersonate", user);
        }

        Ok(rb)
    }

    /// Fetches the list of all users from the Pharos Identity Bridge.
    /// 
    /// Why: Essential for platform transparency, allowing administrators 
    /// to audit active designers and their current access levels.
    pub async fn list_users(&self) -> Result<()> {
        let rb = self.client.get(format!("{}/admin/users", self.base_url));
        let resp = self.inject_auth(rb)?.send().await?;

        if !resp.status().is_success() {
            let err_body = resp.text().await?;
            return Err(anyhow!("Failed to list users: {}", err_body));
        }

        let data: UserListResponse = resp.json().await?;

        println!("\n{:<30} {:<15} {:<15}", "Username/Email", "Status", "Role");
        println!("{}", "-".repeat(65));

        for user in data.users {
            let email = user.attributes.get("email").map(|s| s.as_str()).unwrap_or(&user.username);
            let role = user.attributes.get("custom:role").map(|s| s.as_str()).unwrap_or("NONE");
            println!("{:<30} {:<15} {:<15}", email.cyan(), user.status.green(), role.yellow());
        }

        Ok(())
    }

    /// Updates a user's role in the Pharos platform.
    /// 
    /// Why: Provides the mechanism for granting or revoking high-rigor 
    /// access (e.g., promoting an IKD to ADMIN) through a secure, 
    /// audited CLI command.
    pub async fn update_user(&self, email: &str, role: PharosRole) -> Result<()> {
        let rb = self.client.post(format!("{}/admin/users/update", self.base_url));
        let resp = self.inject_auth(rb)?
            .json(&serde_json::json!({
                "email": email,
                "role": role.to_string()
            }))
            .send()
            .await?;

        if !resp.status().is_success() {
            let err_body = resp.text().await?;
            return Err(anyhow!("Failed to update user: {}", err_body));
        }

        println!("{} Successfully updated {} to role: {}", "✔".green(), email.bold(), role.to_string().yellow());
        Ok(())
    }

    /// Prepares the local environment for user impersonation.
    /// 
    /// Why: Vital for debugging and compliance audits. Impersonation 
    /// allows administrators to see exactly what a designer sees 
    /// without requiring their private credentials.
    pub fn impersonate(&self, email: &str) -> Result<()> {
        let mut ctx = self.load_context();
        
        if email == "clear" || email == "none" {
            ctx.impersonated_user = None;
            self.save_context(&ctx)?;
            println!("{} Impersonation context cleared.", "✔".green());
        } else {
            ctx.impersonated_user = Some(email.to_string());
            self.save_context(&ctx)?;
            println!("{} Impersonation context set for: {}", "✔".green(), email.bold());
            println!("{} All subsequent commands will use the identity of this user.", "ℹ".blue());
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::MockServer;
    use wiremock::matchers::{method, path, header, body_json};
    use wiremock::{ResponseTemplate, Mock};
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_should_list_users_when_admin_authenticated() {
        let mock_server = MockServer::start().await;
        let auth_mgr = AuthManager::new(&mock_server.uri(), PharosEnv::Dev);
        let temp_context = NamedTempFile::new().unwrap();
        
        // Mock token retrieval
        std::env::set_var("CI", "true"); // Keyring bypass
        std::env::set_var("PHAROS_TEST_TOKEN", "mock_access_admin");

        Mock::given(method("GET"))
            .and(path("/admin/users"))
            .and(header("Authorization", "Bearer mock_access_admin"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "users": [
                    {
                        "username": "test@example.com",
                        "status": "CONFIRMED",
                        "attributes": {
                            "email": "test@example.com",
                            "custom:role": "IKD"
                        }
                    }
                ]
            })))
            .mount(&mock_server)
            .await;

        let admin_mgr = AdminManager::new(&mock_server.uri(), auth_mgr, PharosEnv::Dev)
            .with_context_path(temp_context.path().to_path_buf());
        
        let result = admin_mgr.list_users().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_should_update_user_when_admin_authenticated() {
        let mock_server = MockServer::start().await;
        let auth_mgr = AuthManager::new(&mock_server.uri(), PharosEnv::Dev);
        let temp_context = NamedTempFile::new().unwrap();
        
        std::env::set_var("CI", "true");
        std::env::set_var("PHAROS_TEST_TOKEN", "mock_access_admin");

        Mock::given(method("POST"))
            .and(path("/admin/users/update"))
            .and(header("Authorization", "Bearer mock_access_admin"))
            .and(body_json(serde_json::json!({
                "email": "test@example.com",
                "role": "ADMIN"
            })))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "message": "Success"
            })))
            .mount(&mock_server)
            .await;

        let admin_mgr = AdminManager::new(&mock_server.uri(), auth_mgr, PharosEnv::Dev)
            .with_context_path(temp_context.path().to_path_buf());
        
        let result = admin_mgr.update_user("test@example.com", PharosRole::Admin).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_should_include_impersonation_header_when_context_is_set() {
        let mock_server = MockServer::start().await;
        let auth_mgr = AuthManager::new(&mock_server.uri(), PharosEnv::Dev);
        let temp_context = NamedTempFile::new().unwrap();
        
        std::env::set_var("CI", "true");
        std::env::set_var("PHAROS_TEST_TOKEN", "mock_access_admin");

        Mock::given(method("GET"))
            .and(path("/admin/users"))
            .and(header("Authorization", "Bearer mock_access_admin"))
            .and(header("X-Pharos-Impersonate", "target@example.com"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "users": []
            })))
            .mount(&mock_server)
            .await;

        let admin_mgr = AdminManager::new(&mock_server.uri(), auth_mgr, PharosEnv::Dev)
            .with_context_path(temp_context.path().to_path_buf());
        
        let _ = admin_mgr.impersonate("target@example.com");
        
        let result = admin_mgr.list_users().await;
        assert!(result.is_ok());
    }
}
