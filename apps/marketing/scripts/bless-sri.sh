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

# Allowed Domains for SRI Blessing
# Why: Prevents accidental or malicious "blessing" of scripts from unauthorized origins.
ALLOWED_DOMAINS=("cloud.umami.is")

validate_domain() {
    local url=$1
    # Use Node.js for robust URL parsing to avoid brittle regex in bash
    # Rationale: Pass URL via ENV to prevent shell injection (Auditor Remediation)
    local domain=$(URL="$url" node -e "try { console.log(new URL(process.env.URL).hostname); } catch(e) { process.exit(1); }")
    
    if [ -z "$domain" ]; then
        echo "❌ ERROR: Could not parse domain from URL: $url"
        exit 1
    fi

    local allowed=false
    for d in "${ALLOWED_DOMAINS[@]}"; do
        if [ "$domain" == "$d" ]; then
            allowed=true
            break
        fi
    done

    if [ "$allowed" = false ]; then
        echo "❌ SECURITY ERROR: Domain '$domain' is not in the allowlist!"
        echo "   Authorized domains: ${ALLOWED_DOMAINS[*]}"
        exit 1
    fi
    
    echo "   [Security] Domain '$domain' verified."
}

# 1. Visible Handshake & Audit Warning
echo "🛡️ Pharos SRI Gatekeeper: Initiating Blessing Workflow..."
echo "⚠️ WARNING: By running this, you are auditing the code at the upstream URLs."
echo "   ONLY proceed if you have verified the upstream changes and trust the new code."
echo ""

# 2. Extract and Validate URL from source of truth
if [ ! -f "$HASH_FILE" ]; then
    echo "❌ ERROR: $HASH_FILE not found. Cannot proceed."
    exit 1
fi

URL=$(node -e "process.stdout.write(require('$HASH_FILE').umami.url)")

# Fail Fast: Ensure the domain is authorized BEFORE fetching
validate_domain "$URL"

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
# We use sed to replace the integrity hash. 
# Rationale: Target only the Umami script line to prevent cross-talk (Issue #222)
if [ -f "$LAYOUT_FILE" ]; then
    # We use a temporary file to avoid issues with different sed versions
    # Pattern: Target line with 'cloud.umami.is' and replace its sha384 integrity
    sed "/cloud.umami.is/s|integrity=\"sha384-[^\"]*\"|integrity=\"sha384-$ACTUAL_HASH\"|g" "$LAYOUT_FILE" > "$LAYOUT_FILE.tmp"
    mv "$LAYOUT_FILE.tmp" "$LAYOUT_FILE"
    echo "   [Update] $LAYOUT_FILE updated (Targeted Umami)."
else
    echo "⚠️ WARNING: $LAYOUT_FILE not found. Skipping layout update."
fi

# 6. Human Signature Finalization
echo ""
echo "✅ Blessing Complete: Local state updated."
echo "🛡️ ACTION REQUIRED: Review the changes using 'git diff' and sign the commit manually."
echo "   PR Title Suggestion: 'security(audit): bless updated umami sri hash'"
echo ""
