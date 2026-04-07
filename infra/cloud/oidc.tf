/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / OIDC
 * File: oidc.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Establishes OIDC trust between GitHub Actions and AWS.
 * Traceability: Issue #6, ADR 0018
 * ======================================================================== */

# 1. OIDC Provider for GitHub
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"] # GitHub's intermediate CA thumbprint
}

# 2. Trust Policy for GitHub Actions (Generic)
data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.GITHUB_REPO}:*"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

# 3. Role: Auditor (Read-Only/Security Checks)
resource "aws_iam_role" "auditor" {
  name               = "${var.PROJECT_NAME}-gh-auditor"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/ReadOnlyAccess",
    "arn:aws:iam::aws:policy/SecurityAudit"
  ]
}

# 4. Role: Deployer (Restricted to main branch)
resource "aws_iam_role" "deployer" {
  name = "${var.PROJECT_NAME}-gh-deployer"
  
  # Restricted Trust Policy: Only 'main' branch can deploy
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub": "repo:${var.GITHUB_REPO}:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}

# Attach Deployer permissions (Administrator is high, but common for IaC Bootstrap)
# In production, we'd refine this to specific services (Cognito, Cloudflare)
resource "aws_iam_role_policy_attachment" "deployer_admin" {
  role       = aws_iam_role.deployer.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
