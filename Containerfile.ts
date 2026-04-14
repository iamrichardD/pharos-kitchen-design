# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI (TypeScript/Node Builder)
# File: Containerfile.ts
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1
# Purpose: Optimized Zero-Host execution environment for Pharos TS packages
#          (Auth-Bridge, Marketing Site). Includes Wrangler and Audit tools.
# Traceability: Issue #11, ADR-0016
# ========================================================================

# Use public enterprise registry (ADR-0014)
FROM public.ecr.aws/docker/library/node:24-slim

# Install system dependencies for build-essential and security
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Pre-install wrangler globally for edge-worker development
RUN npm install -g wrangler

WORKDIR /work

# Default command: Audit then verify build
CMD ["sh", "-c", "npm audit --audit-level=high && (grep -rnE \"bg-ph-charcoal|text-gray-300|text-gray-400|text-gray-500|bg-black/20|bg-black/40\" apps/marketing/src/ && echo 'FAILED: Legacy theme classes detected' && exit 1 || echo 'Theme Audit: PASSED') && npm install && npm run build"]
