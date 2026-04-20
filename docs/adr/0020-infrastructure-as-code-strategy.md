<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Infrastructure
 * File: 0020-infrastructure-as-code-strategy.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Defining the IaC and Deployment strategy for Project Prism.
 * Traceability: ADR 0018, ADR 0019
 * Status: Proposed
 * ======================================================================== -->

# ADR 0020: Infrastructure as Code (IaC) & Deployment

## Context
Project Prism requires a reproducible, $0-cost infrastructure to manage AWS resources (Cognito, DynamoDB, Lambda) and GitHub deployments (Pages, Releases). We must ensure that the "Auth Bridge" and the "Marketing Site" are tightly coordinated without manual configuration.

## Decision

### 1. IaC Tooling: **OpenTofu**
We will utilize **OpenTofu** for all AWS resource management.
- **State Storage**: S3 Bucket + DynamoDB Table (Free Tier) for remote state locking and persistence.
- **Provider**: `hashicorp/aws` v5.0+.

### 2. CI/CD Orchestration: **GitHub Actions**
A unified workflow (`deploy.yml`) will handle the following lifecycle:
1. **IaC Provisioning**: `tofu apply` to update Cognito/Lambda.
2. **Environment Injection**: Capture IaC outputs (IDs, Endpoints) and inject them as `VITE_` or `PUBLIC_` variables into the Astro build.
3. **Web Deployment**: Build and push the Astro static site to **GitHub Pages**.
4. **Binary Release**: Compile and push the Rust/Tauri binaries to **GitHub Releases**.

### 3. Resource Grouping (Surgical Slices)
Infrastructure will be divided into logical modules:
- `infra/identity`: Cognito User Pool & Clients.
- `infra/auth-bridge`: DynamoDB Table & Lambda Functions.
- `infra/network`: API Gateway (if needed) or Lambda Function URLs (Cost-Effective).

## Rationale
Using OpenTofu ensures that our infrastructure is documented as code, preventing "Manual Drift" and allowing us to recreate the entire Pharos environment in minutes. Coordinating via GitHub Actions eliminates the need for a separate CI tool and keeps our $0-cost bootstrap posture.

## Impact
- **Rigor**: Full reproducibility of the AEC infrastructure.
- **Cost**: $0 for OpenTofu/Actions; AWS costs remain within Free Tier.
- **DX**: One-click deployments from a single `git push`.

## Verification Plan
- [ ] `tofu plan` succeeds in a local Podman-based LocalStack environment.
- [ ] GitHub Action successfully injects Cognito IDs into the Astro build.
- [ ] `tofu destroy` cleanly removes all resources.
