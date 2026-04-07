/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / Variables
 * File: variables.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Variable definitions for OIDC Federation. 
 * Note: Sensitive values (aws_account_id) should be injected via TF_VAR_.
 * Traceability: ADR 0016, ADR 0020
 * ======================================================================== */

variable "aws_account_id" {
  description = "The AWS Account ID (Injected at runtime)."
  type        = string
}

variable "cloudflare_account_id" {
  description = "The Cloudflare Account ID (Injected at runtime)."
  type        = string
}

variable "github_repo" {
  description = "The GitHub repository path (e.g., owner/repo)."
  type        = string
  default     = "iamrichardD/pharos-kitchen-design"
}

variable "project_name" {
  description = "The project name used for resource naming."
  type        = string
  default     = "pkd-prism"
}

variable "region" {
  description = "The AWS region for resource deployment."
  type        = string
  default     = "us-east-1"
}

variable "common_tags" {
  description = "Common tags to apply to all resources."
  type        = map(string)
  default = {
    Project     = "Pharos"
    Environment = "Production"
    ManagedBy   = "OpenTofu"
    Component   = "Identity-Foundation"
  }
}
