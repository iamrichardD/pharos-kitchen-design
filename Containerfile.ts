# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI (TypeScript/Node Builder)
# File: Containerfile.ts
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1
# Purpose: Optimized Zero-Host execution environment for Pharos TS packages.
#          Includes a multi-stage Rust builder for WASM dependencies.
# Traceability: Issue #105, Issue #142 (Build Remediation)
# ========================================================================

# Stage 1: WASM Builder (Rust)
# We use the standard Rust hash defined in our security baseline for absolute parity.
FROM public.ecr.aws/docker/library/rust@sha256:fb328f0f58becb23ba1719940a2c94ece8b0b48afa837d05b79ef64bc1e18f6e AS wasm-builder
WORKDIR /work
ENV CARGO_INCREMENTAL=0

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install wasm-pack (Explicit versioning for environment stability)
RUN cargo install wasm-pack --version 0.15.0

# Copy necessary files for Rust build (including LICENSE for wasm-pack metadata)
COPY Cargo.toml Cargo.lock LICENSE ./
COPY packages/ ./packages/

# Ensure LICENSE file visibility in package directories for wasm-pack
RUN cp LICENSE packages/pkd-core/ && cp LICENSE packages/pkd-toon/

# Build WASM packages (Fail Fast)
RUN wasm-pack build packages/pkd-core --target web
RUN wasm-pack build packages/pkd-toon --target web

# Stage 2: Base Node Environment
FROM public.ecr.aws/docker/library/node:24-slim@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf AS base
ARG BUILD_MODE=debug
RUN apt-get update && apt-get install -y \
    curl openssl && \
    rm -rf /var/lib/apt/lists/*
RUN npm install -g wrangler
WORKDIR /work

# Stage 3: TypeScript Builder
FROM base AS builder

# Copy only package files for caching (ADR-0007)
COPY package.json package-lock.json ./
COPY apps/marketing/package.json apps/marketing/package.json
COPY apps/demo/package.json apps/demo/package.json
COPY packages/pkd-core/package.json packages/pkd-core/package.json
COPY packages/auth-bridge/package.json packages/auth-bridge/package.json
COPY packages/truth-engine/package.json packages/truth-engine/package.json

# Inject WASM artifacts from wasm-builder (Mandatory for @pkd/toon file: dependency)
COPY --from=wasm-builder /work/packages/pkd-core/pkg ./packages/pkd-core/pkg
COPY --from=wasm-builder /work/packages/pkd-toon/pkg ./packages/pkd-toon/pkg

# Install dependencies (Immutable layer if package-lock unchanged)
RUN npm ci

# Copy remaining source code
COPY . .

# Distribute Universal Installers (ADR-0015)
RUN cp scripts/install.sh apps/marketing/public/install.sh && \
    cp scripts/install.ps1 apps/marketing/public/install.ps1

# Run Audits and Fail-Fast Sentinels
RUN (npm audit --audit-level=high || echo "⚠️ Warning: Audit found known issues") && \
    (grep -rnE "text-gray-300|text-gray-400|text-gray-500" apps/marketing/src/ && echo "FAILED: Legacy theme classes detected" && exit 1 || echo "Theme Audit: PASSED") && \
    (grep -rnE "src=\"|srcset=\"" apps/marketing/src/ | grep -v "http" | sed -E 's/.*src="([^"]+)".*/\1/; s/.*srcset="([^"]+)".*/\1/' | sort | uniq | while read asset; do [ -f "apps/marketing/public${asset#/pharos-kitchen-design}" ] || (echo "FAILED: Missing asset $asset" && exit 1); done && echo "Asset Audit: PASSED")

# Verify WASM Integrity before build (ADR-0033 Small Stones)
RUN [ -f "packages/pkd-toon/pkg/pkd_toon_bg.wasm" ] || (echo "❌ Error: pkd-toon WASM missing!" && exit 1)

# Build Marketing Site
RUN npm run build --workspace=apps/marketing

# Default command: No-op
CMD ["echo", "Pharos TS Build Complete"]
