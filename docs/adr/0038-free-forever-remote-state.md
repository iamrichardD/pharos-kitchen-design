/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / ADR
 * File: 0038-free-forever-remote-state.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Migrating Terraform state to Cloudflare R2 to ensure "Free Forever" tier compliance.
 * Traceability: ADR 0020, ADR 0021, Issue #108
 * Status: Approved
 * ======================================================================== */

# ADR 0038: Free Forever Remote State (Cloudflare R2 Pivot)

## Context
ADR 0020 established an AWS-based Terraform state (S3 + DynamoDB). While robust, AWS S3 is a "Leaky Bucket" for long-term maintainability as its free tier is limited to 12 months. This violates the project's directive to avoid non-permanently free services for administrative overhead.

## Decision
We will migrate the Terraform remote state from AWS S3 to **Cloudflare R2**.

### 1. State Storage: **Cloudflare R2**
Cloudflare R2 provides an S3-compatible API and a "Free Forever" tier for the first 10GB of data.
- **Backend**: We will continue using the \`s3\` Terraform backend but configure it with the Cloudflare R2 \`endpoint\`.
- **Configuration**:
  - \`endpoint\`: \`https://<ACCOUNT_ID>.r2.cloudflarestorage.com\`
  - \`skip_region_validation\`: \`true\`
  - \`skip_credentials_validation\`: \`true\`
  - \`skip_requesting_account_id\`: \`true\`
  - \`skip_metadata_api_check\`: \`true\`

### 2. State Locking: **Cloudflare D1 or Local (Staged)**
Cloudflare R2 does not natively support DynamoDB-style locking. We will:
- **Phase 1**: Utilize \`--lock=false\` for non-concurrent CI runs (Temporary).
- **Phase 2**: Implement a custom locking mechanism using Cloudflare D1 if concurrency becomes a risk.

### 3. Secret Purge
Once the migration is verified, we will:
- Decommission the \`aws_s3_bucket.terraform_state\` and \`aws_dynamodb_table.terraform_locks\` resources.
- Retain \`AWS_ACCOUNT_ID\` only for the (free-tier) Cognito and IAM OIDC handshake.

## Rationale
Cloudflare R2 aligns with the project's "Edge-First" and "Cost-Efficiency" mandates (ADR-0021). It ensures that the project's infrastructure remains zero-cost for maintenance, regardless of the developer's AWS account age.

## Impact
- **Cost**: 100% reduction in long-term infrastructure state costs.
- **Portability**: Simplifies the "Zero-Host" local development story by consolidating state on Cloudflare.
- **Security**: Reduces the AWS IAM policy surface area required for the CI deployer.

## Verification Plan
- [ ] Successfully run \`terraform init -migrate-state\` pointing to the R2 endpoint.
- [ ] Verify \`terraform plan\` shows zero changes after migration.
- [ ] Decommission legacy AWS state resources in a final "Surgical Strike" commit.
