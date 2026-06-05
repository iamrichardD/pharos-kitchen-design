#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Security / Audit
# File: apps/marketing/scripts/bless-sri.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Authoritative Gatekeeper for Upstream SRI hashes.
#          Automates synchronization of trusted hashes to BaseLayout.
# Traceability: Issue #220
# ========================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HASH_FILE="$SCRIPT_DIR/blessed-hashes.json"
LAYOUT_FILE="$SCRIPT_DIR/../src/layouts/BaseLayout.astro"

# 1. Visible Handshake & Audit Warning
echo "🛡️ Pharos SRI Gatekeeper: Initiating Blessing Workflow..."
echo "⚠️ WARNING: By running this, you are auditing the code at the upstream URLs."
echo "   ONLY proceed if you have verified the upstream changes and trust the new code."
echo ""

# 2. Extract current URL from source of truth
if [ ! -f "$HASH_FILE" ]; then
    echo "❌ ERROR: $HASH_FILE not found. Cannot proceed."
    exit 1
fi

URL=$(node -e "process.stdout.write(require('$HASH_FILE').umami.url)")

# 3. Fetch and Calculate New Hash
echo "   [Audit] Fetching $URL..."
ACTUAL_HASH=$(curl -s $URL | openssl dgst -sha384 -binary | openssl base64 -A)

if [ -z "$ACTUAL_HASH" ]; then
    echo "❌ ERROR: Failed to fetch or calculate hash for $URL."
    exit 1
fi

echo "   [Audit] New Hash: $ACTUAL_HASH"

# 4. Update blessed-hashes.json
# We use node to update the JSON file safely
node -e "
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('$HASH_FILE', 'utf8'));
  config.umami.hash = '$ACTUAL_HASH';
  fs.writeFileSync('$HASH_FILE', JSON.stringify(config, null, 2) + '\n');
"
echo "   [Update] $HASH_FILE updated."

# 5. Update BaseLayout.astro
# We use sed to replace the integrity hash. We look for the umami script tag.
# Pattern: integrity=\"sha384-[^ \"]+\"
# Since the actual hash doesn't include the 'sha384-' prefix (based on verify-sri.sh logic), 
# we need to ensure the prefix is handled correctly.
# BaseLayout.astro uses: integrity="sha384-..."

if [ -f "$LAYOUT_FILE" ]; then
    # We use a temporary file to avoid issues with different sed versions
    sed "s|integrity=\"sha384-[^\"]*\"|integrity=\"sha384-$ACTUAL_HASH\"|g" "$LAYOUT_FILE" > "$LAYOUT_FILE.tmp"
    mv "$LAYOUT_FILE.tmp" "$LAYOUT_FILE"
    echo "   [Update] $LAYOUT_FILE updated."
else
    echo "⚠️ WARNING: $LAYOUT_FILE not found. Skipping layout update."
fi

# 6. Human Signature Finalization
echo ""
echo "✅ Blessing Complete: Local state updated."
echo "🛡️ ACTION REQUIRED: Review the changes using 'git diff' and sign the commit manually."
echo "   PR Title Suggestion: 'security(audit): bless updated umami sri hash'"
echo ""
