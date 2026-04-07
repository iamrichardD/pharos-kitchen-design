/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / Providers
 * File: providers.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: AWS and Cloudflare provider configuration.
 * Traceability: ADR 0020
 * ======================================================================== */

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  # Backend configuration (Enable after state.tf resources are provisioned)
  backend "s3" {
    bucket         = "pkd-prism-tf-state-967403974464"
    key            = "terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "pkd-prism-tf-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.REGION
}

provider "cloudflare" {
  # API Token or Email/Key should be provided via environment variables:
  # CLOUDFLARE_API_TOKEN or CLOUDFLARE_EMAIL/CLOUDFLARE_API_KEY
}
