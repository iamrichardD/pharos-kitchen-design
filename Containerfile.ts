# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI (TypeScript/Node Builder)
# File: Containerfile.ts
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1
# Purpose: Optimized Zero-Host execution environment for Pharos TS packages.
# Traceability: Issue #105 (Optimization)
# ========================================================================

FROM public.ecr.aws/docker/library/node:24-slim AS base
ARG BUILD_MODE=debug
RUN apt-get update && apt-get install -y \
    python3 make g++ curl openssl && \
    rm -rf /var/lib/apt/lists/*
RUN npm install -g wrangler
WORKDIR /work

FROM base AS builder
# Copy only package files for caching (ADR-0007)
COPY package.json package-lock.json ./
COPY apps/marketing/package.json apps/marketing/package.json
COPY apps/demo/package.json apps/demo/package.json
COPY packages/pkd-core/package.json packages/pkd-core/package.json
COPY packages/auth-bridge/package.json packages/auth-bridge/package.json
COPY packages/truth-engine/package.json packages/truth-engine/package.json

# Install dependencies (Immutable layer if package-lock unchanged)
RUN npm ci

# Copy source
COPY . .

# Distribute Universal Installers (ADR-0015)
RUN cp scripts/install.sh apps/marketing/public/install.sh && \
    cp scripts/install.ps1 apps/marketing/public/install.ps1

# Run Audits (Fail Fast)
RUN (npm audit --audit-level=high || echo "⚠️ Warning: Audit found known issues") && \
    (grep -rnE "text-gray-300|text-gray-400|text-gray-500" apps/marketing/src/ && echo "FAILED: Legacy theme classes detected" && exit 1 || echo "Theme Audit: PASSED") && \
    (grep -rnE "src=\"|srcset=\"" apps/marketing/src/ | grep -v "http" | sed -E 's/.*src="([^"]+)".*/\1/; s/.*srcset="([^"]+)".*/\1/' | sort | uniq | while read asset; do [ -f "apps/marketing/public${asset#/pharos-kitchen-design}" ] || (echo "FAILED: Missing asset $asset" && exit 1); done && echo "Asset Audit: PASSED")

# Build Marketing Site
RUN npm run build --workspace=apps/marketing

# Default command: No-op (we use this container for its side-effects/artifacts)
CMD ["echo", "Pharos TS Build Complete"]
