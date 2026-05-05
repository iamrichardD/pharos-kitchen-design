#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI
# File: scripts/test-staging.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Sentinel check to verify WASM artifacts are staged for containerization.
# Why: Prevents "Stale Artifact Hallucinations" and unblocks Truth Engine tests.
# Traceability: Issue #41, ADR-0017 (Option B)
# ========================================================================

set -e

STAGING_DIR="dist/dialects"
CORE_WASM="packages/pkd-core/pkg/pkd_core_bg.wasm"

echo "🔍 Executing WASM Staging Sentinel..."

# Check 1: Core WASM Artifact
if [ ! -f "$CORE_WASM" ]; then
    echo "   ❌ FAIL: pkd-core WASM bundle missing at $CORE_WASM"
    echo "      Run 'scripts/build-wasm.sh' to compile core."
    exit 1
fi
echo "   ✅ pkd-core WASM: Found."

# Check 2: Manufacturer Dialects
DIALECTS=("pkd_dialect_true.wasm" "pkd_dialect_frymaster.wasm")
MISSING_COUNT=0

for dialect in "${DIALECTS[@]}"; do
    if [ ! -f "$STAGING_DIR/$dialect" ]; then
        echo "   ❌ FAIL: Missing dialect artifact: $STAGING_DIR/$dialect"
        MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
done

if [ $MISSING_COUNT -gt 0 ]; then
    echo "   ❌ Staging Audit: FAILED ($MISSING_COUNT dialects missing)."
    echo "      Run 'scripts/build-wasm.sh' to compile and stage dialects."
    exit 1
fi

# Check 3: Freshness (Basic timestamp check)
# Warning if artifacts are older than 1 hour
# find "$STAGING_DIR" -name "*.wasm" -mmin +60 | grep -q "." && echo "   ⚠️  Warning: Dialects are older than 60 minutes. Sync may be stale."

echo "   ✅ Staging Audit: PASSED."
exit 0
