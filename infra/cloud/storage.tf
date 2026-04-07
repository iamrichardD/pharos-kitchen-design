/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / Storage
 * File: storage.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Cloudflare D1 database provisioning.
 * Traceability: ADR 0021, Issue #5
 * ======================================================================== */

# 1. Cloudflare D1 Database for Auth Bridge
resource "cloudflare_d1_database" "auth_db" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  name       = "${var.PROJECT_NAME}-auth"
}
