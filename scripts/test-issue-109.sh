#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Test / Issue #109
# File: scripts/test-issue-109.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Verification script for SHA-256 Manifest Generation.
# Traceability: Issue #109, ADR-0029
# ========================================================================

set -e

STAGING_DIR="dist/dialects"
MANIFEST_FILE="$STAGING_DIR/manifest.json"
PKD_BIN="target/release/pkd"

echo "🧪 Running Verification for Issue #109..."

# 1. Execute the build (containerized)
# Note: This will take a few minutes as it compiles Rust code in the container.
echo "🏗️  Executing build-wasm.sh --container..."
bash scripts/build-wasm.sh --container

# 2. Check if manifest.json exists
if [ ! -f "$MANIFEST_FILE" ]; then
    echo "❌ Error: manifest.json not found in $STAGING_DIR"
    exit 1
fi
echo "✅ manifest.json exists."

# 3. Verify manifest contents using the pkd binary (which was built during build-wasm.sh)
echo "🔍 Verifying manifest integrity via 'pkd core verify-manifest'..."
if [ ! -f "$PKD_BIN" ]; then
    echo "❌ Error: pkd binary not found at $PKD_BIN"
    exit 1
fi

if ! $PKD_BIN core verify-manifest --path "$STAGING_DIR"; then
    echo "❌ Error: Manifest verification failed."
    exit 1
fi
echo "✅ Manifest verification successful."

# 4. Structural check for sha256: prefix (ADR-0029 requirement)
if ! grep -q "sha256:" "$MANIFEST_FILE"; then
    echo "❌ Error: Manifest entries missing 'sha256:' prefix."
    exit 1
fi
echo "✅ Manifest entries have 'sha256:' prefix."

echo "🎉 Issue #109 Verification Passed!"
