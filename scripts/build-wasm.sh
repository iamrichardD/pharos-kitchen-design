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
    IMAGE="public.ecr.aws/docker/library/rust@sha256:70aebe351faa35667ef36508deb19fe234ff03d67cfe102f095d920a53d0622c"
    bash scripts/podman-wrapper.sh "$IMAGE" bash scripts/build-wasm.sh
    exit 0
fi

# Ensure build dependencies are installed (Safe for CI and Local)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    NEEDED_DEPS=""
    if ! command -v curl &> /dev/null; then NEEDED_DEPS="$NEEDED_DEPS curl"; fi
    if ! command -v wasm-pack &> /dev/null; then NEEDED_DEPS="$NEEDED_DEPS wasm-pack"; fi
    # CLI dependencies for manifest generation
    if ! command -v pkg-config &> /dev/null; then NEEDED_DEPS="$NEEDED_DEPS pkg-config libssl-dev"; fi
    
    if [ -n "$NEEDED_DEPS" ]; then
        echo "⚠️  Missing build dependencies. Installing: $NEEDED_DEPS..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y curl pkg-config libssl-dev
        fi
        
        # Install wasm-pack if it was in NEEDED_DEPS
        if [[ "$NEEDED_DEPS" == *"wasm-pack"* ]]; then
            curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
        fi
    fi
fi

# Fallback for non-linux or if wasm-pack still missing
if ! command -v wasm-pack &> /dev/null; then
    echo "⚠️ wasm-pack not found. Attempting generic install..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

echo "🦀 Building PKD WASM Core..."
wasm-pack build packages/pkd-core --target nodejs

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
        (cd "$dialect" && cargo build --target wasm32-unknown-unknown --release)
        
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
if ! $PKD_BIN core generate-manifest "$STAGING_DIR"; then
    echo "❌ Error: Failed to generate SHA-256 manifest."
    exit 1
fi

echo "✅ WASM Build and Manifest Generation Complete."
