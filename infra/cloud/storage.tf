/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / Storage
 * File: storage.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Cloudflare D1 database and R2 bucket provisioning.
 * Traceability: ADR 0021, Issue #5, Issue #254, Issue #275
 * Last Updated: 2026-06-22
 * ======================================================================== */

# 1. Cloudflare D1 Database for Auth Bridge
resource "cloudflare_d1_database" "auth_db" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  name       = "${var.PROJECT_NAME}-auth"
  lifecycle { ignore_changes = all }
}

# 2. Cloudflare R2 Bucket for BIM Registry Assets
resource "cloudflare_r2_bucket" "registry_bucket" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  name       = "${var.PROJECT_NAME}-registry"
  location   = "WNAM" # Western North America (Low latency for primary targets)
}

# 3. Production-Only CORS Rules for R2 Registry Bucket
resource "cloudflare_r2_bucket_cors" "registry_bucket_cors" {
  account_id  = var.CLOUDFLARE_ACCOUNT_ID
  bucket_name = cloudflare_r2_bucket.registry_bucket.name

  rules = [
    {
      id              = "ProductionOnlyAccess"
      max_age_seconds = 86400
      allowed = {
        methods = ["GET"]
        origins = ["https://iamrichardd.com", "https://*.iamrichardd.com"]
        headers = ["Content-Type", "Range"]
      }
    }
  ]
}
