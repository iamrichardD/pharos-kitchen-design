/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Infrastructure / State
 * File: state.tf
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: AWS S3 and DynamoDB resources for OpenTofu remote state.
 * Traceability: ADR 0020, Issue #5
 * ======================================================================== */

# 1. S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-tf-state-${var.aws_account_id}"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  tags = var.common_tags
}

# 2. Enable Versioning
resource "aws_s3_bucket_versioning" "state_versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# 3. Server-side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "state_encryption" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 4. Public Access Block
resource "aws_s3_bucket_public_access_block" "state_access" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 5. DynamoDB for State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.project_name}-tf-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = var.common_tags
}
