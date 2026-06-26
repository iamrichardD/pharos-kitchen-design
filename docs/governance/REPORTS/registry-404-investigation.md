<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Reports
 * File: docs/governance/REPORTS/registry-404-investigation.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Investigation log detailing the cause and resolution of CDN 404 errors for registry assets.
 * Traceability: Sprint 5.04 CDN Investigation (Issue #306)
 * Last Updated: 2026-06-26
 * ======================================================================== -->

# Pharos Incident Report & Investigation Log: Registry CDN 404 Error

## 📋 Executive Summary
On June 26, 2026, a third investigation was initiated regarding a persistent `404 Not Found` error when attempting to fetch the compiled BIM search registry assets (e.g., `https://registry.iamrichardd.com/pharos-kitchen-design/search-index.bin`). 

This document traces the root cause of the upload pipeline failure, evaluates the design decisions via a multi-persona mob review panel, and details a local test suite integration that catches workflow configuration errors prior to CI execution.

---

## 🔍 Forensic Timeline & Root Cause Analysis

### 1. Log Review & Mismatch Discovery
A detailed review of the GitHub Actions runner logs across the deployment pipeline revealed two primary failure stages:
1. **First Failure (Local vs. Remote Mismatch)**: The initial deployment runs were marked green, but the Wrangler log output showed:
   ```text
   Resource location: local
   🌀 Local dev registry initialized.
   ⚠️ Warning: Use --remote if you want to access the remote instance.
   ```
   Wrangler defaulted to executing R2 storage commands against local Miniflare storage on the runner's ephemeral disk, leaving the remote R2 production bucket empty and causing the CDN to serve a `404 Not Found`.

2. **Second Failure (Credential Resolution Error)**: After appending the `--remote` flag to the upload command, the next GHA run failed during Wrangler custom command execution:
   ```text
   ✘ [ERROR] In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable for wrangler to work.
   ```
   Even though `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables were declared in the step inputs, their values resolved to empty strings.

### 2. The Mechanics of the Credential Failure
Cloudflare secrets are stored as **GitHub Environment Secrets** under the `production` environment in the repository. 
- In GitHub Actions, environment-level secrets are **completely hidden and resolve to empty strings** unless the running job explicitly targets the matching environment name.
- Because `.github/workflows/pulse.yml` did not define the `environment` property for the `pulse` job, GHA did not expose `CLOUDFLARE_API_TOKEN` to the steps, resulting in authentication failures when executing custom remote commands.

---

## 👥 The Mob Review: Stakeholder Perspectives

### 1. Pharos Core Teams
* **`PHAROS_DEV_CORE`**: *“Exposing credentials in a workflow must follow strict boundary controls. Binding the entire job to the `production` environment unconditionally is a security risk for PRs from untrusted forks. We must use a dynamic environment check so that the secrets are only exposed on the `main` branch.”*
* **`PHAROS_IA_CORE`**: *“The demo site and public registry URLs must never drift from our schemas. When the CDN serves a 404, the WebGL Omnibar is starved of data, resulting in a blank interface. Our metadata-first truth guarantees depend on this pipeline being 100% reliable.”*
* **`PHAROS_STRATEGY_CORE`**: *“We cannot tolerate silent failures that slip through green builds, nor can we allow our deployment pipeline to become a blocker. The resolution must be verified locally before any push occurs to eliminate CI trial-and-error.”*

### 2. Engineering Personas
* **Kent Beck (Extreme Programming)**: *“Feedback loops must be immediate. If you only find out that your environment secrets are misconfigured after pushing to GitHub, your development loop is too slow. Write a local check script to parse the workflow file and verify the configuration before we git commit.”*
* **Robert C. Martin (Uncle Bob / SOLID)**: *“A deployment configuration is code. It should be subject to static verification just like Rust or C#. Exposing secrets without explicit environment boundaries is sloppy engineering. We must make the environment target explicit.”*
* **Martin Fowler (Continuous Integration)**: *“CI means keeping the build green. If a build passes but the deployment endpoint is empty, the build has lied. We must enforce environment validation in the core pulse script to verify deployment configuration integrity before merging.”*
* **Kathy Sierra (UX & Cognitive Flow)**: *“Silent 404 errors make developers feel like they're fighting ghosts. We need clear, descriptive error messaging in both the CLI and local test scripts so that a developer immediately knows *why* their wrangler uploads are failing.”*
* **Seth Godin (Product & Trust)**: *“Independent commercial kitchen designers trust Pharos because it works. If our index returns 404, we break that promise. We must ship a pipeline that is remarkable because it never breaks its word.”*

---

## 🛠️ The Technical Solution

The resolution consists of two parts: adding dynamic environment targeting to the workflow, and writing a local test script to enforce compliance.

### 1. Dynamic Environment Binding
In `.github/workflows/pulse.yml`, configure the `pulse` job to dynamically target the `production` environment *only* when the execution occurs on the `main` branch:
```yaml
jobs:
  pulse:
    name: Pulse / ${{ matrix.slice }}
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || null }}
```
This grants Wrangler access to `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment secrets during release builds on `main`, while preventing access during pull request builds on feature branches.

### 2. Local Regression Check Integration
To capture this configuration issue locally and prevent regressions, we created `scripts/test-issue-306.sh`:
```bash
#!/usr/bin/env bash
set -e
WORKFLOW_FILE=".github/workflows/pulse.yml"
if ! grep -q "environment:" "$WORKFLOW_FILE"; then
    echo "❌ FAILED: No environment targeting found in $WORKFLOW_FILE."
    exit 1
fi
if ! grep -E -q "environment:.*production" "$WORKFLOW_FILE"; then
    echo "❌ FAILED: Environment targeting exists, but does not target 'production'."
    exit 1
fi
echo "🟢 PASS: Workflow environment targeting verified."
```
This validation is registered in `scripts/pulse.sh` under `run_core()`, making configuration audits a mandatory part of local verification.
