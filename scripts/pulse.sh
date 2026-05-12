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

# Determine Build Mode (Default to debug, override via env)
# Why: Allows CI to trigger release mode for main branch.
BUILD_MODE=${BUILD_MODE:-debug}

echo "🚀 Starting PKD Pulse: Integrated Ecosystem Validation [Mode: $BUILD_MODE]"

# 0. Infrastructure Verification: Argument Quoting & Container FFI
echo "   [Infra] Verifying Podman-Wrapper Argument Quoting..."
bash scripts/test-quoting.sh

# 1. Build the unified pulse container (Stages: Rust -> TS -> .NET Bridge)
# We use unconfined seccomp to ensure consistent environment parity during the build.
# We mount source caches to speed up dependency downloads while keeping target/ in the image layers.
mkdir -p "$HOME/.cargo/registry" "$HOME/.cargo/git"
podman build \
    --security-opt seccomp=unconfined \
    -t pkd-pulse \
    --build-arg BUILD_MODE="$BUILD_MODE" \
    --volume "$HOME/.cargo/registry:/usr/local/cargo/registry:z" \
    --volume "$HOME/.cargo/git:/usr/local/cargo/git:z" \
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

# Check 2: Governance & SDLC Audit
bash scripts/lint-governance.sh

# Check 3: Supply Chain Verification (Issue #54)
echo "   [Process] Verifying Supply Chain Security Logic..."
# We utilize the pkd-pulse image already built in Step 1 to avoid redundant compilation.
# This ensures we are testing the ACTUAL binary being shipped.
podman run --rm --security-opt seccomp=unconfined pkd-pulse \
    sh -c "echo 'Integrity-Test' > /tmp/good.txt && \
    GOOD_HASH=\$(sha256sum /tmp/good.txt | cut -d' ' -f1) && \
    pkd core verify-manifest /tmp/good.txt \$GOOD_HASH && \
    if pkd core verify-manifest /tmp/good.txt 'wrong-hash' > /dev/null 2>&1; then exit 1; fi"

# Check 4: Branch Naming (Task/Bug ID Traceability)
# In CI (GitHub Actions), HEAD is often detached. We prioritize GITHUB_HEAD_REF.
CURRENT_BRANCH=${GITHUB_HEAD_REF:-$(git rev-parse --abbrev-ref HEAD)}

# Handle detached HEAD in CI where GITHUB_REF_NAME might be set
if [ "$CURRENT_BRANCH" == "HEAD" ]; then
    CURRENT_BRANCH=${GITHUB_REF_NAME:-"HEAD"}
fi

if [[ "$CURRENT_BRANCH" != "main" && ! $CURRENT_BRANCH =~ ^(feat|fix|debt|gov)/issue-[0-9]+ ]]; then
    echo "❌ Error: Branch '$CURRENT_BRANCH' violates naming standard (feat|fix|debt|gov)/issue-X."
    exit 1
fi

# Check 5: PR Marker Verification (The Crucible Audit)
if gh pr view --json body > /dev/null 2>&1; then
    PR_BODY=$(gh pr view --json body -q '.body')
    if [[ ! "$PR_BODY" == *"## ⚔️ The Pharos Crucible (Audit Log)"* ]]; then
        echo "❌ Error: Pull Request body is missing the mandatory 'Pharos Crucible' audit log."
        exit 1
    fi
fi

# Check 6: PowerShell Installation Parity (Issue #94)
echo "   [Process] Verifying scripts/install.ps1 integrity..."
if [ -f "scripts/install.ps1" ]; then
    bash scripts/validate-ps1.sh
else
    echo "   ❌ Error: scripts/install.ps1 is missing."
    exit 1
fi

# Check 7: TDD Traceability (Basic Check for Test Inclusion)
# Ensure any change to src/ includes a corresponding change in tests/ or src/*.test.ts
# In CI, we use GITHUB_BASE_REF. Locally, we default to 'main'.
BASE_REF=${GITHUB_BASE_REF:-"main"}

# Verify if the BASE_REF exists in the local tree to avoid CI failures on shallow clones.
# We check both local and origin namespaces.
if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1 || git rev-parse --verify "origin/$BASE_REF" >/dev/null 2>&1; then
    # Determine the most authoritative reference available
    if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
        COMPARE_REF="$BASE_REF"
    else
        COMPARE_REF="origin/$BASE_REF"
    fi

    # Execute diff with error handling to catch shallow clone depth issues
    if CHANGED_FILES=$(git diff --name-only "$COMPARE_REF...HEAD" 2>/dev/null); then
        if [[ "$CHANGED_FILES" == *"src/"* ]] && [[ ! "$CHANGED_FILES" == *"test"* ]]; then
            echo "⚠️ Warning: Changes to 'src/' detected without corresponding 'test' updates."
            echo "   Ensure TDD traceability (Beck Principle) is maintained."
        fi
    else
        echo "   [Process] Skipping TDD Traceability check: Common ancestor with '$COMPARE_REF' not found (shallow clone?)."
    fi
else
    echo "   [Process] Skipping TDD Traceability check: Base reference '$BASE_REF' not found."
fi

# Check 8: Installation Script Hardening (Issue #102)
echo "   [Process] Verifying installation script hardening..."
./scripts/podman-wrapper.sh "public.ecr.aws/docker/library/debian:bookworm-slim" \
    sh -c "apt-get update && apt-get install -y curl sudo && bash scripts/test-issue-93.sh"

echo "✅ Pulse Complete: Ecosystem & Process Stability Verified."

