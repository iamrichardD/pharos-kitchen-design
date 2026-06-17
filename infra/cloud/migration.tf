/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / Migration
 * File: migration.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Terraform 'moved' blocks for Cloudflare Provider v5 migration.
 * Why: Ensures existing state is preserved when resources are renamed in v5.
 * Traceability: Issue #254
 * Last Updated: 2026-06-17
 * ======================================================================== */

moved {
  from = cloudflare_record.pkd_spf
  to   = cloudflare_dns_record.pkd_spf
}

moved {
  from = cloudflare_record.pkd_dkim
  to   = cloudflare_dns_record.pkd_dkim
}

moved {
  from = cloudflare_record.pkd_dmarc
  to   = cloudflare_dns_record.pkd_dmarc
}

moved {
  from = cloudflare_record.pkd_mx_1
  to   = cloudflare_dns_record.pkd_mx_1
}

moved {
  from = cloudflare_record.pkd_mx_2
  to   = cloudflare_dns_record.pkd_mx_2
}

moved {
  from = cloudflare_record.pkd_mx_3
  to   = cloudflare_dns_record.pkd_mx_3
}

moved {
  from = cloudflare_d1_database.auth_db
  to   = cloudflare_d1_database.auth_db
}

moved {
  from = cloudflare_r2_bucket.registry_bucket
  to   = cloudflare_r2_bucket.registry_bucket
}

moved {
  from = cloudflare_r2_bucket_domain.registry_domain
  to   = cloudflare_r2_custom_domain.registry_domain
}

moved {
  from = cloudflare_record.registry_dns
  to   = cloudflare_dns_record.registry_dns
}
