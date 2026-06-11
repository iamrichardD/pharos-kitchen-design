#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / Build
# File: build-wasm.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Centralized build script for all WASM targets.
# Traceability: Issue #65, Issue #81, ADR-0017
# ========================================================================

set -e

# Handle containerized build request
if [[ "$1" == "--container" ]]; then
    echo "🏗️  Executing Deterministic Container Build (Zero-Host)..."
    # We use the standard Rust hash defined in the pulse container for absolute parity.
    IMAGE="public.ecr.aws/docker/library/rust@sha256:fb328f0f58becb23ba1719940a2c94ece8b0b48afa837d05b79ef64bc1e18f6e"
    bash scripts/podman-wrapper.sh "$IMAGE" bash scripts/build-wasm.sh
    exit 0
fi

# Ensure build dependencies are installed (Safe for CI and Local)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    NEEDED_DEPS=""
    if ! command -v curl &> /dev/null; then NEEDED_DEPS="$NEEDED_DEPS curl"; fi
    # CLI dependencies for manifest generation
    if ! command -v pkg-config &> /dev/null; then NEEDED_DEPS="$NEEDED_DEPS pkg-config libssl-dev"; fi
    
    if [ -n "$NEEDED_DEPS" ]; then
        echo "⚠️  Missing system dependencies. Installing: $NEEDED_DEPS..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y $NEEDED_DEPS
        fi
    fi
fi

# Ensure correct wasm-pack version (ADR-0033 Small Stones)
WASM_PACK_VERSION="0.15.0"
WASM_PACK_BIN=$(command -v wasm-pack || echo "")

if [ -z "$WASM_PACK_BIN" ] || [[ "$($WASM_PACK_BIN --version 2>&1)" != *"wasm-pack $WASM_PACK_VERSION"* ]]; then
    echo "⚠️  wasm-pack missing or incorrect version. Installing pinned version $WASM_PACK_VERSION..."
    curl -LsSf https://github.com/rustwasm/wasm-pack/releases/download/v0.15.0/wasm-pack-v0.15.0-x86_64-unknown-linux-musl.tar.gz -o wasm-pack.tgz
    echo "c09f971ecaed9a2efc80fdcea7a00ef6b53c7fadc8c57d1f61b53a6aa66b668a  wasm-pack.tgz" | sha256sum -c -
    tar xzf wasm-pack.tgz
    # Note: Using sudo or appropriate permissions might be needed depending on environment, 
    # but in our Podman/CI context we target /usr/local/cargo/bin/ which is usually writable.
    mv wasm-pack-v0.15.0-x86_64-unknown-linux-musl/wasm-pack /usr/local/cargo/bin/
    rm -rf wasm-pack.tgz wasm-pack-v0.15.0-x86_64-unknown-linux-musl
    WASM_PACK_BIN=$(command -v wasm-pack)
fi

# Ensure LICENSE file visibility for WASM builds (ADR-0033 Small Stones)
echo "🛡️  Syncing LICENSE metadata..."
cp LICENSE packages/pkd-core/
cp LICENSE packages/pkd-toon/

echo "🦀 Building PKD WASM Core..."
RUSTFLAGS="-D warnings" wasm-pack build packages/pkd-core --target web
# Fix package name for @pkd scope
sed -i 's/"name": "pkd-core"/"name": "@pkd\/core"/' packages/pkd-core/pkg/package.json

echo "🏷️ Building PKD TOON Parser (WASM)..."
RUSTFLAGS="-D warnings" wasm-pack build packages/pkd-toon --target web
# Fix package name for @pkd scope
sed -i 's/"name": "pkd-toon"/"name": "@pkd\/toon"/' packages/pkd-toon/pkg/package.json

echo "🍳 Building and Staging Manufacturer Dialects..."
STAGING_DIR="dist/dialects"
mkdir -p "$STAGING_DIR"

for dialect in packages/dialects/*; do
    if [ -d "$dialect" ]; then
        dialect_name=$(basename "$dialect")
        # Extract the snake_case name for the .wasm file (e.g. pkd-dialect-true -> pkd_dialect_true)
        wasm_name=$(echo "$dialect_name" | tr '-' '_')
        
        echo "   -> Building Dialect: $dialect_name"
        
        # We use cargo build --target wasm32-unknown-unknown --release
        # as these are Extism plugins, not standard wasm-pack packages.
        (cd "$dialect" && RUSTFLAGS="-D warnings" cargo build --target wasm32-unknown-unknown --release)
        
        # Stage the artifact
        # Handle both workspace (target at root) and independent (target in dialect)
        TARGET_FILE="$dialect/target/wasm32-unknown-unknown/release/$wasm_name.wasm"
        WORKSPACE_TARGET="target/wasm32-unknown-unknown/release/$wasm_name.wasm"
        
        if [ -f "$TARGET_FILE" ]; then
            cp "$TARGET_FILE" "$STAGING_DIR/"
        elif [ -f "$WORKSPACE_TARGET" ]; then
            cp "$WORKSPACE_TARGET" "$STAGING_DIR/"
        else
            echo "❌ Error: Could not find WASM artifact for $dialect_name (Checked: $TARGET_FILE and $WORKSPACE_TARGET)"
            exit 1
        fi
        echo "   ✅ Staged: $STAGING_DIR/$wasm_name.wasm"
    fi
done

echo "🛡️ Generating SHA-256 Manifest (ADR-0029)..."
# Build the CLI to use its manifest generation capability (Surgical implementation)
# We build only the pkd binary to minimize build time.
cargo build --package pkd --release
PKD_BIN="target/release/pkd"

# Fail Fast: Ensure the manifest is generated correctly
if ! $PKD_BIN registry generate-manifest "$STAGING_DIR"; then
    echo "❌ Error: Failed to generate SHA-256 manifest."
    exit 1
fi

echo "✅ WASM Build and Manifest Generation Complete."
