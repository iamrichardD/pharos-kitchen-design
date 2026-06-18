#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Infrastructure / Remediation
# File: state-recovery.sh
# Purpose: Deep state manipulation to resolve Cloudflare v5 migration deadlock.
# Why: Bypasses schema limitations by extracting raw IDs and performing rm/import.
# Traceability: Issue #254
# ========================================================================

set -e

# Load account ID and Zone ID from environment variables
ACCOUNT_ID=${TF_VAR_CLOUDFLARE_ACCOUNT_ID}
ZONE_ID=${TF_VAR_cloudflare_zone_id}

echo "🛠️ Starting Deep State Recovery..."

# 1. Pull the raw state
tofu state pull > raw_state.json

# Helper function to extract ID from raw state
get_id() {
    local address=$1
    # Extracts the 'id' attribute from the resource matching the address
    jq -r ".resources[] | select(.type + \".\" + .name == \"$address\") | .instances[0].attributes.id" raw_state.json
}

REMEDIATE_DNS() {
    local name=$1
    local legacy_addr="cloudflare_record.$name"
    local new_addr="cloudflare_dns_record.$name"
    
    echo "Processing $name..."
    
    # Try to find existing record ID
    RECORD_ID=$(get_id "$legacy_addr")
    
    if [ -n "$RECORD_ID" ] && [ "$RECORD_ID" != "null" ]; then
        echo "Found legacy record $name with ID: $RECORD_ID"
        echo "Manually re-mapping to $new_addr..."
        
        # Remove old address from state (Safe state operation)
        tofu state rm "$legacy_addr" || true
        
        # Import as new type (The source of truth remains in Cloudflare)
        # DNS Record Import format: <zone_id>/<record_id>
        tofu import "$new_addr" "$ZONE_ID/$RECORD_ID"
    else
        echo "Legacy record $name not found or already migrated."
    fi
}

# Process the known core records
REMEDIATE_DNS "pkd_spf"
REMEDIATE_DNS "pkd_dmarc"
REMEDIATE_DNS "pkd_mx_1"
REMEDIATE_DNS "pkd_mx_2"
REMEDIATE_DNS "pkd_mx_3"

# 2. Remediate D1 Database
# The error was 'missing required database_id parameter'
# This happens because v5 expects ID to be account_id/database_id
D1_ADDR="cloudflare_d1_database.auth_db"
D1_ID=$(get_id "$D1_ADDR")

if [ -n "$D1_ID" ] && [ "$D1_ID" != "null" ]; then
    # Check if ID is already in v5 format (contains a slash)
    if [[ "$D1_ID" != *"/"* ]]; then
        echo "Updating D1 Database ID format for v5..."
        tofu state rm "$D1_ADDR" || true
        # D1 Import format: <account_id>/<database_id>
        tofu import "$D1_ADDR" "$ACCOUNT_ID/$D1_ID"
    else
        echo "D1 Database ID already in v5 format."
    fi
fi

echo "✅ Deep State Recovery Complete."
