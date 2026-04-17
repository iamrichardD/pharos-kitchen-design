#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI
# File: pulse.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Single-command validation of the entire Pharos ecosystem.
# ========================================================================

set -e

echo "🚀 Starting Pharos Pulse: Integrated Ecosystem Validation"

# 1. Build the unified pulse container (Stages: Rust -> TS -> .NET Bridge)
# We use unconfined seccomp to ensure consistent environment parity during the build.
podman build \
    --security-opt seccomp=unconfined \
    -t pkd-pulse \
    -f Containerfile.pulse .

# 2. Execute the final integrated handshake in the container
# This confirms that the .NET bridge can successfully consume the Rust core.
podman run --rm \
    --security-opt seccomp=unconfined \
    pkd-pulse

echo "🔍 Starting Pharos Process Linting: Governance Verification"

# 3. Process Linting (Pharos Standard)

# Check 1: Branch Naming (Task/Bug ID Traceability)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! $CURRENT_BRANCH =~ ^(feat|fix|debt)/issue-[0-9]+ ]]; then
    echo "❌ Error: Branch '$CURRENT_BRANCH' violates naming standard (feat|fix|debt)/issue-X."
    exit 1
fi

# Check 2: PR Marker Verification (The Crucible Audit)
if gh pr view --json body > /dev/null 2>&1; then
    PR_BODY=$(gh pr view --json body -q '.body')
    if [[ ! "$PR_BODY" == *"## ⚔️ The Pharos Crucible (Audit Log)"* ]]; then
        echo "❌ Error: Pull Request body is missing the mandatory 'Pharos Crucible' audit log."
        exit 1
    fi
fi

# Check 3: TDD Traceability (Basic Check for Test Inclusion)
# Ensure any change to src/ includes a corresponding change in tests/ or src/*.test.ts
CHANGED_FILES=$(git diff --name-only main...HEAD)
if [[ "$CHANGED_FILES" == *"src/"* ]] && [[ ! "$CHANGED_FILES" == *"test"* ]]; then
    echo "⚠️ Warning: Changes to 'src/' detected without corresponding 'test' updates."
    echo "   Ensure TDD traceability (Beck Principle) is maintained."
fi

echo "✅ Pulse Complete: Ecosystem & Process Stability Verified."
