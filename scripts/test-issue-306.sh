#!/usr/bin/env bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Testing / CI Verification
# File: scripts/test-issue-306.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Local test to capture and verify workflow environment targeting for secrets.
# Traceability: Issue #306
# Last Updated: 2026-06-26
# ========================================================================

set -e

WORKFLOW_FILE=".github/workflows/pulse.yml"

echo "🧪 Running local verification for workflow environment targeting..."

if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Error: Workflow file $WORKFLOW_FILE not found."
    exit 1
fi

# Assert that 'environment:' is declared in the pulse job to expose production environment secrets
if ! grep -q "environment:" "$WORKFLOW_FILE"; then
    echo "❌ FAILED: No environment targeting found in $WORKFLOW_FILE."
    echo "   Without targeting, environment-level secrets like CLOUDFLARE_API_TOKEN will be empty."
    exit 1
fi

if ! grep -E -q "environment:.*production" "$WORKFLOW_FILE"; then
    echo "❌ FAILED: Environment targeting exists, but does not target 'production'."
    exit 1
fi

echo "🟢 PASS: Workflow environment targeting verified. Secrets will be successfully resolved."
exit 0
