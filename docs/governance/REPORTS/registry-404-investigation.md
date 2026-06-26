<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Reports
 * File: docs/governance/REPORTS/registry-404-investigation.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Investigation log detailing the cause and resolution of CDN 404 errors for registry assets.
 * Traceability: Sprint 5.04 CDN Investigation
 * Last Updated: 2026-06-26
 * ======================================================================== -->

# Pharos Incident Report & Investigation Log: Registry CDN 404 Error

## 📋 Executive Summary
On June 26, 2026, an investigation was initiated regarding a persistent `404 Not Found` error when attempting to fetch the compiled BIM search registry assets (e.g., `https://registry.iamrichardd.com/pharos-kitchen-design/search-index.bin`). 

This document traces the root cause to a mismatch in environment targeting within the Cloudflare Wrangler upload steps of our GitHub Actions workflow, compiles architectural feedback from our core teams and historical engineering mentors, and establishes the verification protocol to ensure long-term stability.

---

## 🔍 Forensic Timeline & Root Cause Analysis

### 1. Log Review & Mismatch Discovery
A detailed review of the GitHub Actions runner log for the successful `main` build branch revealed critical diagnostic indicators:
* **Upload Step Outcome**: The step was marked green, but the Wrangler log output showed:
  ```text
  Resource location: local
  🌀 Local dev registry initialized.
  ⚠️ Warning: Use --remote if you want to access the remote instance.
  ```
* **CDN Error**: Despite the build passing, requests to the custom domain `https://registry.iamrichardd.com/pharos-kitchen-design/search-index.bin` returned `404 Not Found`.

### 2. The Mechanics of the Failure
Wrangler (Cloudflare's developer CLI) executes its storage commands locally (using Miniflare to simulate a local R2 instance on the runner's ephemeral disk) unless explicitly commanded to talk to the Cloudflare API. 
* **The Ghost Bucket**: The actions executed successfully but wrote the baked assets directly to the runner's local filesystem under `.wrangler/state/v3/r2/...`.
* **Zero CDN Propagation**: Because the runner was destroyed immediately after step completion, these assets vanished, and the actual remote R2 storage bucket `pkd-prism-registry` remained empty.

---

## 👥 The Mob Review: Stakeholder Perspectives

### 1. Pharos Core Teams
* **`PHAROS_DEV_CORE`**: *“Our test suite runs inside Podman to isolate GLIBC and FFI environments, but this represents a configuration seam outside the container boundary. We need local shell scripts to emulate this upload stage and prevent CI pipelines from silently succeeding when external side-effects fail.”*
* **`PHAROS_IA_CORE`**: *“The URI namespace `pharos-kitchen-design/search-index.bin` must map exactly to our physical schema. Silent redirection or failure to upload breaks our documentation guarantees to independent kitchen designers, creating cognitive overhead and erosion of trust in the schema.”*
* **`PHAROS_STRATEGY_CORE`**: *“This is an operational availability risk. If the search index is missing, the demo page fails to load, degrading the Pharos onboarding experience. We must enforce strict pre-flight validation on the remote bucket after every deploy.”*

### 2. Engineering Mentors
* **Kent Beck (Extreme Programming)**: *“Make the change easy, then make the easy change. The issue here is feedback loop lag: we only find out the asset is missing when someone loads the website. Let's make the pipeline fail if the uploaded asset isn't queryable immediately via HTTP.”*
* **Robert C. Martin (Uncle Bob / SOLID)**: *“This is a violation of the Single Responsibility Principle on the deployment runner. The upload configuration should not implicitly determine the target state (local vs remote) based on the presence of credentials. Exposing a naked command to the environment without explicit bounds is poor engineering. Explicit is always better than implicit.”*
* **Martin Fowler (Refactoring / CI)**: *“Continuous Integration is only as good as the assertions you run against the integrated product. If your CI job finishes green but the deployment target is broken, your build has lied to you. A true build validation step must include an end-to-end integration test querying the production endpoint.”*
* **Kathy Sierra (UX & Cognitive Flow)**: *“Don't make developers feel stupid when the tool fails. The warning was there: `Use --remote if you want to access the remote instance`. But it was buried in pages of build logs. We need to raise the signal-to-noise ratio so developers can focus on building badass kitchen layouts instead of hunting down Cloudflare CDN configuration bugs.”*
* **Seth Godin (Product & Trust)**: *“Shipping is not just pushing buttons. Shipping is making a promise and keeping it. When a kitchen designer gets a 404, we break that promise. Let's build a deployment pipeline that is remarkable—not because it's complex, but because it is completely reliable.”*

---

## 🛠️ The Technical Solution

The remedy is to append the `--remote` flag to the Wrangler action commands in `.github/workflows/pulse.yml`. This explicitly directs the CLI to bypass the local simulated storage engine and communicate directly with Cloudflare's production API using the supplied `secrets.CLOUDFLARE_API_TOKEN` and `secrets.CLOUDFLARE_ACCOUNT_ID`.

### Actionable Diff
```diff
       - name: Upload Index Tarball to Cloudflare R2
         if: github.ref == 'refs/heads/main' && matrix.slice == 'core'
         uses: cloudflare/wrangler-action@v3
         with:
           apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
           accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
           wranglerVersion: "4.103.0"
-          command: r2 object put pkd-prism-registry/pharos-kitchen-design/search-index.tar.zst --file=.artifacts/registry/search-index.tar.zst
+          command: r2 object put pkd-prism-registry/pharos-kitchen-design/search-index.tar.zst --file=.artifacts/registry/search-index.tar.zst --remote

       - name: Upload Index Binary to Cloudflare R2
         if: github.ref == 'refs/heads/main' && matrix.slice == 'core'
         uses: cloudflare/wrangler-action@v3
         with:
           apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
           accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
           wranglerVersion: "4.103.0"
-          command: r2 object put pkd-prism-registry/pharos-kitchen-design/search-index.bin --file=.artifacts/registry/search-index.bin
+          command: r2 object put pkd-prism-registry/pharos-kitchen-design/search-index.bin --file=.artifacts/registry/search-index.bin --remote
```

---

## 🧪 Local Testing & Verification Plan

To verify this locally and capture the failure behavior before pushing to CI, we can perform the following tests:

1. **Dry-Run Analysis (Verify Local Default)**
   Execute Wrangler locally without passing credentials or the `--remote` flag:
   ```bash
   npx wrangler r2 object put pkd-prism-registry/test-key --file=README.md
   ```
   *Expected Output*: The CLI should print the warning:
   ```text
   Resource location: local
   Use --remote if you want to access the remote instance.
   ```
   This confirms that Wrangler defaults to local simulation mode in the absence of the flag.

2. **Verification of the Fix Configuration**
   Validate the workflow file syntax using local dry-run tools (e.g. `action-validator`) or direct inspection of the CI configuration steps to verify that the `--remote` flag is correctly appended to all Cloudflare Wrangler upload operations.
