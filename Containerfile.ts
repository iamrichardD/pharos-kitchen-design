# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI (TypeScript/Node Builder)
# File: Containerfile.ts
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1
# Purpose: Optimized Zero-Host execution environment for Pharos TS packages.
#          Includes a multi-stage Rust builder for WASM dependencies.
# Traceability: Issue #105, Issue #142 (Build Remediation), Issue #282, Issue #284
# Last Updated: 2026-06-22
# ========================================================================

# Stage 1: WASM Builder (Rust)
# We use the standard Rust hash defined in our security baseline for absolute parity.
FROM public.ecr.aws/docker/library/rust@sha256:fb328f0f58becb23ba1719940a2c94ece8b0b48afa837d05b79ef64bc1e18f6e AS wasm-builder
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /work
ENV CARGO_INCREMENTAL=0

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install wasm-pack (Standardized pinned binary for environment stability)
RUN curl -LsSf https://github.com/rustwasm/wasm-pack/releases/download/v0.15.0/wasm-pack-v0.15.0-x86_64-unknown-linux-musl.tar.gz -o wasm-pack.tgz && \
    echo "c09f971ecaed9a2efc80fdcea7a00ef6b53c7fadc8c57d1f61b53a6aa66b668a  wasm-pack.tgz" | sha256sum -c - && \
    tar xzf wasm-pack.tgz && \
    mv wasm-pack-v0.15.0-x86_64-unknown-linux-musl/wasm-pack /usr/local/cargo/bin/ && \
    rm -rf wasm-pack.tgz wasm-pack-v0.15.0-x86_64-unknown-linux-musl

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
ENV DEBIAN_FRONTEND=noninteractive
ARG BUILD_MODE=debug
RUN apt-get update && apt-get install -y --no-install-recommends apt-utils
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl openssl libterm-readline-gnu-perl && \
    rm -rf /var/lib/apt/lists/*
RUN npm install -g wrangler
WORKDIR /work

# Stage 3: Demo Builder Stage
FROM base AS demo-builder
ENV DEBIAN_FRONTEND=noninteractive

# Copy package files for caching (ADR-0007)
COPY package.json package-lock.json ./
COPY apps/marketing/package.json apps/marketing/package.json
COPY apps/demo/package.json apps/demo/package.json
COPY packages/pkd-core/package.json packages/pkd-core/package.json
COPY packages/auth-bridge/package.json packages/auth-bridge/package.json
COPY packages/truth-engine/package.json packages/truth-engine/package.json

# Inject WASM artifacts from wasm-builder
COPY --from=wasm-builder /work/packages/pkd-core/pkg ./packages/pkd-core/pkg
COPY --from=wasm-builder /work/packages/pkd-toon/pkg ./packages/pkd-toon/pkg

# Install dependencies (Immutable layer if package-lock unchanged)
RUN npm ci --omit=dev

# Copy remaining source code
COPY . .

# Build internal protocol package first (ADR-0007)
RUN npm install tsup typescript && npm run build --workspace=@pkd/protocol

# Build Demo Site (ADR-0004)
RUN npm run build --workspace=apps/demo

# Stage 4: Marketing Builder Stage
FROM base AS marketing-builder
ENV DEBIAN_FRONTEND=noninteractive

# Copy package files for caching (ADR-0007)
COPY package.json package-lock.json ./
COPY apps/marketing/package.json apps/marketing/package.json
COPY apps/demo/package.json apps/demo/package.json
COPY packages/pkd-core/package.json packages/pkd-core/package.json
COPY packages/auth-bridge/package.json packages/auth-bridge/package.json
COPY packages/truth-engine/package.json packages/truth-engine/package.json

# Inject WASM artifacts from wasm-builder
COPY --from=wasm-builder /work/packages/pkd-core/pkg ./packages/pkd-core/pkg
COPY --from=wasm-builder /work/packages/pkd-toon/pkg ./packages/pkd-toon/pkg

# Install dependencies (Immutable layer if package-lock unchanged)
RUN npm ci --omit=dev

# Copy remaining source code
COPY . .

# Distribute Universal Installers (ADR-0015)
RUN cp scripts/install.sh apps/marketing/public/install.sh && \
    cp scripts/install.ps1 apps/marketing/public/install.ps1

# Run Security Audit (Fail Fast)
RUN npm audit fix --omit=dev --force --include-workspace-root

# Run Design System Sentinel (No Legacy Gray Classes)
RUN if grep -rnE "text-gray-300|text-gray-400|text-gray-500" apps/marketing/src/; then echo "FAILED: Legacy theme classes detected" && exit 1; else echo "Theme Audit: PASSED"; fi

# Verify Local Asset Integrity (Prevent Ghost Images)
RUN grep -rnE "src=\"|srcset=\"" apps/marketing/src/ | grep -v "http" | grep -v "\\$" | sed -E 's/.*src="([^"]+)".*/\1/; s/.*srcset="([^"]+)".*/\1/' | sort | uniq | while read asset; do [ -f "apps/marketing/public${asset#/pharos-kitchen-design}" ] || { echo "FAILED: Missing asset $asset" && exit 1; }; done && echo "Asset Audit: PASSED"

# Build internal protocol package first (ADR-0007)
RUN npm install tsup typescript && npm run build --workspace=@pkd/protocol

# Build Marketing Site
RUN npm run build --workspace=apps/marketing

# Stage 5: Final Packaging Stage
FROM base AS packager
ENV DEBIAN_FRONTEND=noninteractive

# Copy built marketing site
COPY --from=marketing-builder /work/apps/marketing/dist /work/apps/marketing/dist

# Copy built demo site nested under marketing/dist/demo
COPY --from=demo-builder /work/apps/demo/dist /work/apps/marketing/dist/demo

# Fail-Fast Assembly Validation
RUN [ -f "apps/marketing/dist/demo/index.html" ] || (echo "❌ Error: Demo build nesting failed!" && exit 1)

# Default command: No-op
CMD ["echo", "Pharos TS Build Complete"]
