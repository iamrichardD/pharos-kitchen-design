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

# Ensure wasm-pack is installed (Safe for CI and Local)
if ! command -v wasm-pack &> /dev/null; then
    echo "⚠️ wasm-pack not found. Installing..."
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
        cp "$dialect/target/wasm32-unknown-unknown/release/$wasm_name.wasm" "$STAGING_DIR/"
        echo "   ✅ Staged: $STAGING_DIR/$wasm_name.wasm"
    fi
done

echo "✅ WASM Build and Staging Complete."
