/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / DNS
 * File: infra/cloud/dns_auth.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Authoritative DNS Records for the 'pkd' identity subdomain.
 * Why: Segregates application-specific email authority from primary business records.
 * Traceability: Issue #205, Issue #254, ADR-0050
 * Last Updated: 2026-06-17
 * ======================================================================== */

# --- SPF (Sender Policy Framework) ---
# Authorizes Cloudflare to send on behalf of pkd.iamrichardd.com
resource "cloudflare_dns_record" "pkd_spf" {
  zone_id = var.cloudflare_zone_id
  name    = "pkd"
  content = "v=spf1 include:_spf.mx.cloudflare.net ~all"
  type    = "TXT"
  ttl     = 3600
}

# --- DKIM (DomainKeys Identified Mail) ---
# Cryptographic signature for the 'pkd' subdomain.
# Note: This is conditional to allow the MX records to be provisioned FIRST.
resource "cloudflare_dns_record" "pkd_dkim" {
  count   = var.dkim_public_key != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "${var.dkim_selector != "" ? var.dkim_selector : "cloudflare"}._domainkey.pkd"
  content = "v=DKIM1; k=rsa; p=${var.dkim_public_key}"
  type    = "TXT"
  ttl     = 3600
}

# --- DMARC (Domain-based Message Authentication) ---
# Policy for the 'pkd' subdomain.
resource "cloudflare_dns_record" "pkd_dmarc" {
  zone_id = var.cloudflare_zone_id
  name    = "_dmarc.pkd"
  content = "v=DMARC1; p=quarantine; rua=mailto:${var.admin_email}"
  type    = "TXT"
  ttl     = 3600
}

# --- MX Records (Cloudflare Email Routing) ---
# Directs mail for the 'pkd' subdomain to the Edge router.
resource "cloudflare_dns_record" "pkd_mx_1" {
  zone_id  = var.cloudflare_zone_id
  name     = "pkd"
  content  = "route1.mx.cloudflare.net"
  type     = "MX"
  priority = 10
  ttl      = 3600
  lifecycle { ignore_changes = all }
}

resource "cloudflare_dns_record" "pkd_mx_2" {
  zone_id  = var.cloudflare_zone_id
  name     = "pkd"
  content  = "route2.mx.cloudflare.net"
  type     = "MX"
  priority = 20
  ttl      = 3600
  lifecycle { ignore_changes = all }
}

resource "cloudflare_dns_record" "pkd_mx_3" {
  zone_id  = var.cloudflare_zone_id
  name     = "pkd"
  content  = "route3.mx.cloudflare.net"
  type     = "MX"
  priority = 30
  ttl      = 3600
  lifecycle { ignore_changes = all }
}

# --- R2 Registry Bucket Custom Domain Binding ---
resource "cloudflare_r2_custom_domain" "registry_domain" {
  account_id  = var.CLOUDFLARE_ACCOUNT_ID
  bucket_name = cloudflare_r2_bucket.registry_bucket.name
  domain      = "registry.iamrichardd.com"
  enabled     = true
  zone_id     = var.cloudflare_zone_id
}

# --- Variables ---
# Injected via TF_VAR_ environmental variables in GitHub Actions.
variable "cloudflare_zone_id" {
  description = "The Cloudflare Zone ID for the root domain"
  type        = string
}

variable "dkim_selector" {
  description = "The DKIM selector for the identity subdomain"
  type        = string
  default     = "cloudflare"
}

variable "dkim_public_key" {
  description = "The DKIM public key for the identity subdomain"
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_email" {
  description = "The administrative email for DMARC reports"
  type        = string
  default     = ""
}
# Triggering recovery run
# Final cleanup
# Breaking lock cascade
