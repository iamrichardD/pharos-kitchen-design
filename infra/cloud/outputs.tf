/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / Outputs
 * File: outputs.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Exposes critical ARNs for GitHub Action configuration.
 * Traceability: Issue #6
 * ======================================================================== */

output "auditor_role_arn" {
  description = "The ARN for the GitHub Auditor role."
  value       = aws_iam_role.auditor.arn
}

output "deployer_role_arn" {
  description = "The ARN for the GitHub Deployer role."
  value       = aws_iam_role.deployer.arn
}

output "oidc_provider_arn" {
  description = "The ARN for the OIDC Provider."
  value       = aws_iam_openid_connect_provider.github.arn
}

# Identity Outputs
output "cognito_user_pool_id" {
  description = "The ID of the Cognito User Pool."
  value       = aws_cognito_user_pool.pool.id
}

output "cognito_client_id" {
  description = "The ID of the Cognito App Client."
  value       = aws_cognito_user_pool_client.client.id
}

output "cognito_domain" {
  description = "The Cognito Hosted UI domain."
  value       = aws_cognito_user_pool_domain.main.domain
}

# Storage Outputs
output "cloudflare_d1_id" {
  description = "The ID of the Cloudflare D1 database."
  value       = cloudflare_d1_database.auth_db.id
}
