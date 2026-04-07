/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / Identity
 * File: identity.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: AWS Cognito User Pool and App Client configuration.
 * Traceability: ADR 0018, Issue #5, Issue #7
 * ======================================================================== */

# 1. Cognito User Pool
resource "aws_cognito_user_pool" "pool" {
  name = "${var.project_name}-user-pool"

  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]

  # Protective Lifecycle: Prevent accidental deletion of user identities
  lifecycle {
    prevent_destroy = true
  }

  tags = var.common_tags

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Custom attributes for ABAC (Hero vs IKD)
  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "pkd_role"
    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }
}

# 2. App Client for Public Clients (CLI / Revit / Web)
resource "aws_cognito_user_pool_client" "client" {
  name = "${var.project_name}-public-client"

  user_pool_id = aws_cognito_user_pool.pool.id

  # Public Client: No secret required
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"

  # Token validity
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

# 3. Cognito Domain (Required for some OIDC flows)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-auth"
  user_pool_id = aws_cognito_user_pool.pool.id
}
