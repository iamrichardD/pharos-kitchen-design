# Infrastructure Bootstrap Guide (Project Prism)

This document outlines the high-rigor process for initializing the Pharos cloud infrastructure. To maintain a $0-cost bootstrap posture while ensuring collaborative state locking, we follow a two-phase initialization.

## Prerequisites
- **OpenTofu** (or Terraform) installed.
- AWS CLI configured with administrator credentials.
- Cloudflare API Token with permissions for D1.

## Phase 1: Local Bootstrap
Initially, the remote backend is disabled to allow OpenTofu to create the state-holding resources themselves.

1. **Initialize**:
   ```bash
   tofu init
   ```

2. **Apply (Local State)**:
   You must provide your AWS and Cloudflare Account IDs.
   ```bash
   tofu apply \
     -var="aws_account_id=YOUR_AWS_ID" \
     -var="cloudflare_account_id=YOUR_CF_ID"
   ```
   *Note: This will create the S3 bucket, DynamoDB table, Cognito User Pool, and D1 database.*

## Phase 2: Remote State Migration
Once the S3 and DynamoDB resources are provisioned, we migrate the local state to the cloud for high-rigor locking and collaboration.

1. **Enable Backend**:
   Open `providers.tf` and uncomment the `backend "s3"` block. Replace `<ACCOUNT_ID>` with your actual AWS Account ID.

2. **Migrate State**:
   ```bash
   tofu init -migrate-state
   ```
   *When prompted "Do you want to copy existing state to the new backend?", type **yes**.*

## Phase 3: Cleanup
1. Verify the state file exists in the S3 bucket (`pkd-prism-tf-state-...`).
2. Delete the local `terraform.tfstate` and `terraform.tfstate.backup` files.

## Variables Reference
| Variable | Source | Purpose |
| :--- | :--- | :--- |
| `aws_account_id` | AWS Console | Scopes S3 bucket naming and IAM. |
| `cloudflare_account_id` | CF Dashboard | Target for D1 database provisioning. |
| `common_tags` | `variables.tf` | Applied to all resources for traceability. |

---
**Traceability**: ADR-0020, Issue #5
**Owner**: Richard D. (https://github.com/iamrichardd)
