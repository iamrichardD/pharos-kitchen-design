#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI
# File: scripts/supply-chain-watchdog.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: High-rigor pre-engineering dependency audit.
#          Verifies image pinning, npm/cargo version pinning, and
#          deprecated dependency detection (e.g., prebuild-install).
# Traceability: Issue #169
# ========================================================================

set -e

# Fail Fast: Ensure we are running from the project root
if [ ! -e ".git" ]; then
    echo "❌ Error: supply-chain-watchdog.sh must be run from the project root."
    exit 1
fi

echo "🛡️ Pharos Supply Chain Watchdog: Starting audit..."

# 1. Determine or build the Audit Environment
# Why: Ensures the audit logic runs in a high-rigor, standardized environment.
# We reuse pkd-core-builder if available to save time in the Pulse pipeline.
IMAGE_NAME="pkd-audit-env"
if podman image exists pkd-core-builder > /dev/null 2>&1; then
    IMAGE_NAME="pkd-core-builder"
    echo "   [Infra] Reusing existing pkd-core-builder image."
else
    echo "   [Infra] Building Audit Environment..."
    podman build \
        --security-opt seccomp=unconfined \
        --target rust-builder \
        -t "$IMAGE_NAME" \
        -f Containerfile.pulse . > /dev/null 2>&1
fi

# 2. Execute the Audit subcommand via Podman
# Why: Standardizes the audit execution and enforces the Zero-Host mandate.
# We use 'cargo run' to ensure the CLI is built with the latest changes and 
# executed against the mounted host filesystem.
echo "   [Audit] Executing CLI Supply Chain Audit..."
./scripts/podman-wrapper.sh "$IMAGE_NAME" \
    sh -c "cargo run --package pkd --bin pkd --quiet -- registry audit"

echo "✅ Supply Chain Audit Complete: Pharos Green."
