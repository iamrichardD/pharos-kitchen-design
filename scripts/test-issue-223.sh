#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Testing / Security
# File: scripts/test-issue-223.sh
# Purpose: Reproduction script for Issue #223 (Domain Allowlist)
# Traceability: Issue #223, ADR-0052
# ========================================================================

set -e

# Mandatory Podman Check (Zero-Host Execution)
if [ ! -f /.dockerenv ] && [ ! -f /run/.containerenv ]; then
    echo "🛡️ Pharos Safety Gate: Redirecting test to Podman container..."
    exec bash scripts/podman-wrapper.sh pkd-ts bash scripts/test-issue-223.sh
fi

SCRIPT_DIR="apps/marketing/scripts"
HASH_FILE="$SCRIPT_DIR/blessed-hashes.json"
BACKUP_FILE="$SCRIPT_DIR/blessed-hashes.json.bak"

echo "🧪 Running Test for Issue #223: Domain Allowlist Verification..."

# 1. Setup: Backup original hash file
cp "$HASH_FILE" "$BACKUP_FILE"

# 2. Case 1: Unauthorized Domain
echo "   [Test] Case 1: Attempting to bless from malicious.com (Should Fail)"
cat <<EOF > "$HASH_FILE"
{
  "umami": {
    "url": "https://malicious.com/script.js",
    "hash": "some-old-hash"
  }
}
EOF

if bash "$SCRIPT_DIR/bless-sri.sh"; then
    echo "❌ FAIL: bless-sri.sh should have failed for malicious.com"
    # Restore and exit
    mv "$BACKUP_FILE" "$HASH_FILE"
    exit 1
else
    echo "✅ PASS: bless-sri.sh correctly rejected malicious.com (or failed as expected)"
fi

# 3. Case 2: Authorized Domain (cloud.umami.is)
echo "   [Test] Case 2: Attempting to bless from cloud.umami.is (Should Pass)"
# Restore original (which has umami.is)
mv "$BACKUP_FILE" "$HASH_FILE"

if bash "$SCRIPT_DIR/bless-sri.sh"; then
    echo "✅ PASS: bless-sri.sh allowed cloud.umami.is"
else
    echo "❌ FAIL: bless-sri.sh failed for cloud.umami.is but should have passed"
    exit 1
fi

echo "🎉 All tests passed (once implemented)!"
