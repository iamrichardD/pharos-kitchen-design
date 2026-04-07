/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / Variables
 * File: variables.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Variable definitions for Project Prism IaC.
 * Note: Uppercase keys used for compatibility with strict env parsers.
 * Traceability: ADR 0016, ADR 0020, Issue #5
 * ======================================================================== */

variable "AWS_ACCOUNT_ID" {
  description = "The AWS Account ID (Injected at runtime)."
  type        = string
}

variable "CLOUDFLARE_ACCOUNT_ID" {
  description = "The Cloudflare Account ID (Injected at runtime)."
  type        = string
}

variable "GITHUB_REPO" {
  description = "The GitHub repository path (e.g., owner/repo)."
  type        = string
  default     = "iamrichardD/pharos-kitchen-design"
}

variable "PROJECT_NAME" {
  description = "The project name used for resource naming."
  type        = string
  default     = "pkd-prism"
}

variable "REGION" {
  description = "The AWS region for resource deployment."
  type        = string
  default     = "us-east-1"
}

variable "COMMON_TAGS" {
  description = "Common tags to apply to all resources."
  type        = map(string)
  default = {
    Project     = "Pharos"
    Environment = "Production"
    ManagedBy   = "OpenTofu"
    Component   = "Identity-Foundation"
  }
}
