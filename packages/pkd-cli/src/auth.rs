/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Auth Module)
 * File: packages/pkd-cli/src/auth.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Implementation of RFC 8628 Device Authorization Grant.
 * Traceability: Issue #10 - Auth Handshake
 * ======================================================================== */

use crate::models::{PharosRole, PharosEnv};
use anyhow::{Result, anyhow};
use keyring::Entry;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;
use colored::*;
use jsonwebtoken::{decode_header, decode, DecodingKey, Validation};

const AUTH_SERVICE_BASE: &str = "pharos-kitchen-design";
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
pub(crate) struct Claims {
    pub sub: String,
    pub email: Option<String>,
    #[serde(rename = "custom:role")]
    pub role: Option<String>,
    pub exp: usize,
}

/// Implementation of the Pharos Identity Bridge client.
/// 
/// Purpose: Manages the lifecycle of a CLI session, including RFC 8628 
/// authorization, secure token storage in the system keyring, and 
/// identity display.
#[derive(Clone)]
pub struct AuthManager {
    client: Client,
    base_url: String,
    env: PharosEnv,
}

impl AuthManager {
    pub fn new(base_url: &str, env: PharosEnv) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.to_string(),
            env,
        }
    }

    fn get_service_name(&self) -> String {
        match self.env {
            PharosEnv::Prod => AUTH_SERVICE_BASE.to_string(),
            _ => format!("{}-{}", AUTH_SERVICE_BASE, self.env),
        }
    }

    /// Initiates the RFC 8628 Device Authorization Flow.
    /// 
    /// Why: This flow is essential for CLI-based identity without local 
    /// browser redirection. It ensures that designers can authenticate on 
    /// restricted workstations (e.g., BIM managers' machines) while 
    /// approving the session via a secure personal device.
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

    /// Revokes the local session and clears the system keyring.
    /// 
    /// Why: To ensure that abandoned CLI sessions do not become permanent 
    /// attack vectors. Clearing the keyring is the primary security gate 
    /// for Pharos local-host integrity.
    pub fn logout(&self) -> Result<()> {
        let service = self.get_service_name();
        let entry_access = Entry::new(&service, TOKEN_KEY)?;
        let entry_id = Entry::new(&service, ID_TOKEN_KEY)?;
        let entry_refresh = Entry::new(&service, REFRESH_TOKEN_KEY)?;

        let _ = entry_access.delete_password();
        let _ = entry_id.delete_password();
        let _ = entry_refresh.delete_password();

        println!("{} Logged out successfully from '{}' environment.", "✔".green(), self.env);
        Ok(())
    }

    /// Displays the current identity and roles for the active session.
    /// 
    /// Why: Provides immediate feedback to the user on their authorization 
    /// state (e.g., verifying their role as IKD or ADMIN) without performing 
    /// a full server-side signature check, reducing latency.
    pub fn whoami(&self) -> Result<()> {
        let service = self.get_service_name();
        let entry = Entry::new(&service, ID_TOKEN_KEY)?;
        match entry.get_password() {
            Ok(token) => {
                let claims = self.decode_id_token_insecure(&token)?;
                println!("{} Environment: {}", "ℹ".blue(), self.env.to_string().cyan());
                println!("{} Authenticated as: {}", "✔".green(), claims.email.unwrap_or_else(|| claims.sub.clone()).bold());
                if let Some(role) = claims.role {
                    println!("{} Role: {}", "ℹ".blue(), role.yellow());
                }
                Ok(())
            }
            Err(_) => {
                println!("{} Not authenticated in '{}' environment. Run `pkd --env {} auth login` to begin.", "ℹ".red(), self.env, self.env);
                Ok(())
            }
        }
    }

    /// Retrieves the current role from the stored ID token.
    /// 
    /// Why: Enables local "Fail Fast" authorization checks before making 
    /// expensive network calls to the Auth Bridge.
    pub fn get_current_role(&self) -> Result<Option<PharosRole>> {
        let service = self.get_service_name();
        let entry = Entry::new(&service, ID_TOKEN_KEY)?;
        match entry.get_password() {
            Ok(token) => {
                let claims = self.decode_id_token_insecure(&token)?;
                match claims.role {
                    Some(role_str) => {
                        // Cognito roles are stored as SCREAMING_SNAKE_CASE strings
                        let role: PharosRole = serde_json::from_str(&format!("\"{}\"", role_str))
                            .map_err(|e| anyhow!("Unknown Pharos role '{}': {}", role_str, e))?;
                        Ok(Some(role))
                    }
                    None => Ok(None),
                }
            }
            Err(_) => Ok(None),
        }
    }

    pub(crate) fn decode_id_token_insecure(&self, token: &str) -> Result<Claims> {
        let header = decode_header(token)?;
        let mut validation = Validation::new(header.alg);
        validation.validate_exp = false; // We want to check roles even if session is stale
        validation.insecure_disable_signature_validation();

        let token_data = decode::<Claims>(
            token, 
            &DecodingKey::from_secret("".as_ref()),
            &validation
        )?;
        Ok(token_data.claims)
    }

    /// Retrieves the stored access token from the system keyring.
    pub fn get_token(&self) -> Result<String> {
        if std::env::var("CI").is_ok() {
            if let Ok(token) = std::env::var("PHAROS_TEST_TOKEN") {
                return Ok(token);
            }
        }
        let service = self.get_service_name();
        let entry = Entry::new(&service, TOKEN_KEY)?;
        entry.get_password().map_err(|_| anyhow!("Not authenticated in '{}' environment. Please run `pkd --env {} auth login`", self.env, self.env))
    }

    fn store_tokens(&self, access: &str, id: &str, refresh: &str) -> Result<()> {
        // Only use keyring if not in a CI environment that lacks a secret-service/keychain
        if std::env::var("CI").is_ok() {
            println!("{} CI detected: Skipping keyring storage.", "ℹ".yellow());
            return Ok(());
        }

        let service = self.get_service_name();
        let entry_access = Entry::new(&service, TOKEN_KEY)?;
        let entry_id = Entry::new(&service, ID_TOKEN_KEY)?;
        let entry_refresh = Entry::new(&service, REFRESH_TOKEN_KEY)?;

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
    async fn test_should_return_role_when_id_token_contains_it() {
        let auth_mgr = AuthManager::new("http://localhost", PharosEnv::Dev);
        
        // For this unit test, we'll verify the parsing logic in get_current_role
        let claims_decoded = auth_mgr.decode_id_token_insecure(&format_mock_token("ADMIN")).unwrap();
        assert_eq!(claims_decoded.role, Some("ADMIN".to_string()));
    }

    fn format_mock_token(role: &str) -> String {
        let claims = serde_json::json!({
            "sub": "123",
            "email": "test@example.com",
            "custom:role": role,
            "exp": 9999999999u64
        });
        // This is a minimal JWT format for insecure decoding (UrlSafeNoPad)
        use base64::{Engine as _, engine::general_purpose};
        let payload = general_purpose::URL_SAFE_NO_PAD.encode(serde_json::to_string(&claims).unwrap());
        format!("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{}.signature", payload)
    }

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

        let auth_mgr = AuthManager::new(&mock_server.uri(), PharosEnv::Dev);
        std::env::set_var("CI", "true"); // Prevent keyring usage in tests
        let result = auth_mgr.login().await;

        assert!(result.is_ok());
    }
}
