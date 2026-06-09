/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / DNS
 * File: infra/cloud/dns_auth.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Authoritative Email Deliverability Records (SPF, DKIM, DMARC).
 * Traceability: Issue #205, ADR-0050
 * Last Updated: 2026-06-09
 * ======================================================================== */

# --- SPF (Sender Policy Framework) ---
# Authorizes Cloudflare Email Routing to send on behalf of the domain.
resource "cloudflare_record" "spf" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = "v=spf1 include:_spf.mx.cloudflare.net ~all"
  type    = "TXT"
  ttl     = 3600
}

# --- DKIM (DomainKeys Identified Mail) ---
# Establishing authority via GitHub Secrets provided at deployment time.
resource "cloudflare_record" "dkim" {
  zone_id = var.cloudflare_zone_id
  name    = "${var.dkim_selector}._domainkey"
  value   = "v=DKIM1; k=rsa; p=${var.dkim_public_key}"
  type    = "TXT"
  ttl     = 3600
}

# --- DMARC (Domain-based Message Authentication) ---
# Instructs recipient servers to quarantine emails that fail SPF/DKIM.
resource "cloudflare_record" "dmarc" {
  zone_id = var.cloudflare_zone_id
  name    = "_dmarc"
  value   = "v=DMARC1; p=quarantine; rua=mailto:admin@iamrichardd.com"
  type    = "TXT"
  ttl     = 3600
}

# --- Variables ---
# Injected via TF_VAR_ environmental variables in GitHub Actions.
variable "cloudflare_zone_id" {
  description = "The Cloudflare Zone ID for the domain"
  type        = string
}

variable "dkim_selector" {
  description = "The DKIM selector (e.g., 'cloudflare')"
  type        = string
}

variable "dkim_public_key" {
  description = "The DKIM public key provided by the edge provider"
  type        = string
  sensitive   = true
}
