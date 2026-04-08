/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Auth Module)
 * File: packages/pkd-cli/src/auth.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Implementation of RFC 8628 Device Authorization Grant.
 * Traceability: Issue #10 - Auth Handshake
 * ======================================================================== */

use anyhow::{Result, anyhow};
use keyring::Entry;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;
use colored::*;
use jsonwebtoken::{decode_header, decode, DecodingKey, Validation};

const AUTH_SERVICE: &str = "pharos-kitchen-design";
const TOKEN_KEY: &str = "access_token";
const ID_TOKEN_KEY: &str = "id_token";
const REFRESH_TOKEN_KEY: &str = "refresh_token";

#[derive(Debug, Serialize, Deserialize)]
struct DeviceAuthResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
enum TokenResponse {
    Success {
        access_token: String,
        id_token: String,
        refresh_token: String,
        token_type: String,
        expires_in: u64,
    },
    Error {
        error: String,
        error_description: Option<String>,
    },
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    email: Option<String>,
    #[serde(rename = "custom:role")]
    role: Option<String>,
    exp: usize,
}

pub struct AuthManager {
    client: Client,
    base_url: String,
}

impl AuthManager {
    pub fn new(base_url: &str) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.to_string(),
        }
    }

    pub async fn login(&self) -> Result<()> {
        println!("{} Connecting to Pharos Identity Bridge...", "ℹ".blue());

        // 1. Request Device Code
        let device_resp: DeviceAuthResponse = self.client
            .post(format!("{}/auth/device", self.base_url))
            .json(&serde_json::json!({ "client_id": "pkd-cli" }))
            .send()
            .await?
            .json()
            .await?;

        println!("\n{} Action Required!", "⚠".yellow().bold());
        println!("1. Open your browser and navigate to: {}", device_resp.verification_uri.cyan().underline());
        println!("2. Enter the following code: {}", device_resp.user_code.green().bold());
        println!("\n{} Waiting for authorization...", "⌛".blue());

        // 2. Poll for Token
        let poll_interval = Duration::from_secs(device_resp.interval.max(1));
        loop {
            sleep(poll_interval).await;

            let token_resp: TokenResponse = self.client
                .post(format!("{}/auth/token", self.base_url))
                .json(&serde_json::json!({
                    "device_code": device_resp.device_code,
                    "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
                }))
                .send()
                .await?
                .json()
                .await?;

            match token_resp {
                TokenResponse::Success { access_token, id_token, refresh_token, .. } => {
                    self.store_tokens(&access_token, &id_token, &refresh_token)?;
                    println!("{} Login successful!", "✔".green());
                    return Ok(());
                }
                TokenResponse::Error { error, .. } => {
                    if error == "authorization_pending" {
                        continue;
                    } else {
                        return Err(anyhow!("Authentication failed: {}", error));
                    }
                }
            }
        }
    }

    pub fn logout(&self) -> Result<()> {
        let entry_access = Entry::new(AUTH_SERVICE, TOKEN_KEY)?;
        let entry_id = Entry::new(AUTH_SERVICE, ID_TOKEN_KEY)?;
        let entry_refresh = Entry::new(AUTH_SERVICE, REFRESH_TOKEN_KEY)?;

        let _ = entry_access.delete_password();
        let _ = entry_id.delete_password();
        let _ = entry_refresh.delete_password();

        println!("{} Logged out successfully.", "✔".green());
        Ok(())
    }

    pub fn whoami(&self) -> Result<()> {
        let entry = Entry::new(AUTH_SERVICE, ID_TOKEN_KEY)?;
        match entry.get_password() {
            Ok(token) => {
                // Decode JWT (Insecurely for display, real validation happens at the edge)
                let header = decode_header(&token)?;
                let mut validation = Validation::new(header.alg);
                validation.validate_exp = false; // We just want to see who we are even if expired
                validation.insecure_disable_signature_validation();

                let token_data = decode::<Claims>(
                    &token, 
                    &DecodingKey::from_secret("".as_ref()), // Key not needed for insecure decode
                    &validation
                )?;

                println!("{} Authenticated as: {}", "✔".green(), token_data.claims.email.unwrap_or_else(|| token_data.claims.sub.clone()).bold());
                if let Some(role) = token_data.claims.role {
                    println!("{} Role: {}", "ℹ".blue(), role.yellow());
                }
                Ok(())
            }
            Err(_) => {
                println!("{} Not authenticated. Run `pkd auth login` to begin.", "ℹ".red());
                Ok(())
            }
        }
    }

    fn store_tokens(&self, access: &str, id: &str, refresh: &str) -> Result<()> {
        // Only use keyring if not in a CI environment that lacks a secret-service/keychain
        if std::env::var("CI").is_ok() {
            println!("{} CI detected: Skipping keyring storage.", "ℹ".yellow());
            return Ok(());
        }

        let entry_access = Entry::new(AUTH_SERVICE, TOKEN_KEY)?;
        let entry_id = Entry::new(AUTH_SERVICE, ID_TOKEN_KEY)?;
        let entry_refresh = Entry::new(AUTH_SERVICE, REFRESH_TOKEN_KEY)?;

        entry_access.set_password(access).map_err(|e| anyhow!("Failed to store access token: {}", e))?;
        entry_id.set_password(id).map_err(|e| anyhow!("Failed to store ID token: {}", e))?;
        entry_refresh.set_password(refresh).map_err(|e| anyhow!("Failed to store refresh token: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::MockServer;
    use wiremock::matchers::{method, path, body_json};
    use wiremock::{ResponseTemplate, Mock};

    #[tokio::test]
    async fn test_should_return_tokens_when_auth_successful() {
        let mock_server = MockServer::start().await;

        // Mock Device Code Endpoint
        Mock::given(method("POST"))
            .and(path("/auth/device"))
            .and(body_json(serde_json::json!({ "client_id": "pkd-cli" })))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "device_code": "dev123",
                "user_code": "ABCD-1234",
                "verification_uri": "http://example.com/verify",
                "expires_in": 600,
                "interval": 1
            })))
            .mount(&mock_server)
            .await;

        // Mock Token Endpoint (Success on first poll)
        Mock::given(method("POST"))
            .and(path("/auth/token"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "access_token": "acc_tok",
                "id_token": "id_tok",
                "refresh_token": "ref_tok",
                "token_type": "Bearer",
                "expires_in": 3600
            })))
            .mount(&mock_server)
            .await;

        let auth_mgr = AuthManager::new(&mock_server.uri());
        std::env::set_var("CI", "true"); // Prevent keyring usage in tests
        let result = auth_mgr.login().await;

        assert!(result.is_ok());
    }
}
