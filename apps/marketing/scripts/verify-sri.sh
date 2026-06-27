#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Security / Audit
# File: apps/marketing/scripts/verify-sri.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Fail Fast verification of third-party script integrity.
# Traceability: Priority 2, Issue #29, Issue #220
# ========================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HASH_FILE="$SCRIPT_DIR/blessed-hashes.json"

# Fail Fast: Ensure blessed-hashes.json exists
if [ ! -f "$HASH_FILE" ]; then
    echo "❌ ERROR: $HASH_FILE not found. Run ./scripts/bless-sri.sh to initialize."
    exit 1
fi

# Extract URL and Expected Hash using node (avoids jq dependency)
# We use an absolute path for require to avoid issues with current working directory
URL=$(node -e "process.stdout.write(require('$HASH_FILE').umami.url)")
EXPECTED_HASH=$(node -e "process.stdout.write(require('$HASH_FILE').umami.hash)")

echo "Checking script integrity for $URL..."
ACTUAL_HASH=$(curl -s $URL | openssl dgst -sha384 -binary | openssl base64 -A)

if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
    echo "❌ FAIL-FAST: Umami SRI Mismatch (Upstream Drift Detected)!"
    echo "   Expected: $EXPECTED_HASH"
    echo "   Actual:   $ACTUAL_HASH"
    echo ""
    echo "   Remediation: If you trust the upstream change, run:"
    echo "   ./scripts/bless-sri.sh"
    exit 1
fi

echo "✅ SRI Verified Successfully: Pharos Green."
exit 0
