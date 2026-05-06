#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI
# File: pulse.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Single-command validation of the entire PKD ecosystem.
# Traceability: Issue #81
# ========================================================================

set -e

echo "🚀 Starting PKD Pulse: Integrated Ecosystem Validation"

# 0. Infrastructure Verification: Argument Quoting & Container FFI
echo "   [Infra] Verifying Podman-Wrapper Argument Quoting..."
bash scripts/test-quoting.sh

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

echo "🔍 Starting PKD Process Linting: Governance Verification"

# 3. Process Linting (PKD Standard)

# Check 1: File Prologue Audit (FSL-1.1 Legal Compliance)
echo "   [Process] Verifying FSL-1.1 File Prologues..."
MISSING_PROLOGUES=0
while IFS= read -r file; do
    if ! grep -q "Project: Pharos Kitchen Design" "$file"; then
        echo "      ❌ Missing prologue in: $file"
        MISSING_PROLOGUES=$((MISSING_PROLOGUES + 1))
    fi
done < <(find packages -name "*.ts" -not -path "*/node_modules/*" -not -path "*/pkg/*" -not -path "*/.wrangler/*")

if [ $MISSING_PROLOGUES -gt 0 ]; then
    echo "   ❌ Error: $MISSING_PROLOGUES files are missing the mandatory Standardized File Prologue."
    exit 1
fi

# Check 3: Supply Chain Verification (Issue #54)
echo "   [Process] Verifying Supply Chain Security Logic..."
# We utilize the pkd-pulse image already built in Step 1 to avoid redundant compilation.
# This ensures we are testing the ACTUAL binary being shipped.
podman run --rm --security-opt seccomp=unconfined pkd-pulse \
    sh -c "echo 'Integrity-Test' > /tmp/good.txt && \
    GOOD_HASH=\$(sha256sum /tmp/good.txt | cut -d' ' -f1) && \
    pkd core verify-manifest /tmp/good.txt \$GOOD_HASH && \
    if pkd core verify-manifest /tmp/good.txt 'wrong-hash' 2>/dev/null; then exit 1; fi"

# Check 4: Branch Naming (Task/Bug ID Traceability)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" && ! $CURRENT_BRANCH =~ ^(feat|fix|debt)/issue-[0-9]+ ]]; then
    echo "❌ Error: Branch '$CURRENT_BRANCH' violates naming standard (feat|fix|debt)/issue-X."
    exit 1
fi

# Check 2: PR Marker Verification (The Crucible Audit)
if gh pr view --json body > /dev/null 2>&1; then
    PR_BODY=$(gh pr view --json body -q '.body')
    if [[ ! "$PR_BODY" == *"## ⚔️ The PKD Crucible (Audit Log)"* ]]; then
        echo "❌ Error: Pull Request body is missing the mandatory 'PKD Crucible' audit log."
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

