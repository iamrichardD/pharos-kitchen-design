#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI
# File: pulse.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Sharded validation of the PKD ecosystem (Core, Bridge, Marketing).
# Traceability: Issue #108, Issue #147, ADR-0017, ADR-0035
# ========================================================================

set -e

# Determine Build Mode (Default to debug, override via env)
BUILD_MODE=${BUILD_MODE:-debug}
SLICE=""

# Parse Arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --slice) SLICE="$2"; shift ;;
        *) echo "❌ Error: Unknown parameter '$1'"; exit 1 ;;
    esac
    shift
done

# --- Slice Definitions ---

# Why: Validates the Rust core, governance standards, and supply chain security.
# This slice acts as the 'Security Warden' for the monorepo.
run_core() {
    echo "🚀 [Slice: CORE] Verifying Rust, Governance, and Supply Chain..."

    # 1. Infrastructure Verification: Argument Quoting
    echo "   [Infra] Verifying Podman-Wrapper Argument Quoting..."
    bash scripts/test-quoting.sh

    # 2. Build the Core Warden Environment (Fail Fast)
    # Why: This builds the container while running fmt, clippy, tests, and audit inside.
    #      Consolidating these ensures atomicity and saves disk space in CI.
    echo "   [Build] Building Pharos Core Environment (Quality Gates Included)..."
    podman build \
        --security-opt seccomp=unconfined \
        --target rust-builder \
        -t pkd-core-builder \
        --build-arg BUILD_MODE="$BUILD_MODE" \
        -f Containerfile.pulse .

    # 3. Supply Chain Verification (Automated)
    # Why: Ensures dependency security and image pinning before proceeding.
    echo "   [Process] Verifying Supply Chain Security Logic..."
    bash scripts/supply-chain-watchdog.sh
    
    podman run --rm --security-opt seccomp=unconfined pkd-core-builder \
        sh -c "echo 'Integrity-Test' > /tmp/good.txt && \
        GOOD_HASH=\$(sha256sum /tmp/good.txt | cut -d' ' -f1) && \
        /work/target/$BUILD_MODE/pkd registry verify --path /tmp/good.txt --hash \$GOOD_HASH && \
        if /work/target/$BUILD_MODE/pkd registry verify --path /tmp/good.txt --hash 'wrong-hash' > /dev/null 2>&1; then exit 1; fi"

    # 4. Governance & SDLC Audit
    echo "   [Process] Verifying Governance Standards..."
    bash scripts/lint-governance.sh

    # 4b. Roadmap Synchronization (ADR-0051)
    # Why: Ensures the public roadmap is always in sync with authoritative logs.
    echo "   [Process] Synchronizing Authoritative Roadmap..."
    ./scripts/podman-wrapper.sh "public.ecr.aws/docker/library/node:24-bookworm" npx tsx scripts/sync-roadmap.ts

    # 5. File Prologue Audit (FSL-1.1 Legal Compliance)
    # Why: Ensures every source file acknowledges the FSL-1.1 license and traceability.
    echo "   [Process] Verifying FSL-1.1 File Prologues..."
    MISSING_PROLOGUES=0
    while IFS= read -r file; do
        if ! grep -q "Project: Pharos Kitchen Design" "$file"; then
            echo "      ❌ Missing prologue in: $file"
            MISSING_PROLOGUES=$((MISSING_PROLOGUES + 1))
        fi
    done < <(find apps packages -type f \( -name "*.ts" -o -name "*.rs" -o -name "*.astro" -o -name "*.cs" \) -not -path "*/node_modules/*" -not -path "*/pkg/*" -not -path "*/.wrangler/*" -not -path "*/obj/*" -not -path "*/bin/*" -not -path "*/.astro/*" -not -path "*/dist/*")

    if [ $MISSING_PROLOGUES -gt 0 ]; then
        echo "   ❌ Error: $MISSING_PROLOGUES files are missing the mandatory Standardized File Prologue."
        exit 1
    fi

    # 6. Crucible Audit Log Verification (The Hard Gate)
    # Why: Ensures every non-trivial task has been peer-reviewed by an independent auditor (ADR-0037).
    echo "   [Process] Verifying Crucible Audit Log..."
    CURRENT_BRANCH=${GITHUB_HEAD_REF:-$(git rev-parse --abbrev-ref HEAD)}
    if [ "$CURRENT_BRANCH" == "HEAD" ]; then CURRENT_BRANCH=${GITHUB_REF_NAME:-"HEAD"}; fi

    if [[ "$CURRENT_BRANCH" =~ ^(feat|fix|debt|gov)/issue-([0-9]+) ]]; then
        ISSUE_ID="${BASH_REMATCH[2]}"
        AUDIT_FILE="docs/governance/audits/issue-${ISSUE_ID}.md"
        
        if [ ! -f "$AUDIT_FILE" ]; then
            echo "      ⚠️  Warning: Missing mandatory audit log: $AUDIT_FILE"
            echo "      Note: Builders MUST create a high-rigor PR BEFORE the Audit phase begins."
            echo "      Merging to main will be BLOCKED until this log is present and PHAROS GREEN."
        elif ! grep -qE "Status.*🟢.*PHAROS GREEN" "$AUDIT_FILE"; then
            echo "      ❌ Error: Audit log $AUDIT_FILE exists but status is NOT PHAROS GREEN."
            exit 1
        else
            echo "      🟢 Audit Log Verified: Issue #$ISSUE_ID is PHAROS GREEN."
        fi
    fi

    # 7. Branch Naming & PR Markers
    if [[ "$CURRENT_BRANCH" != "main" && ! $CURRENT_BRANCH =~ ^(feat|fix|debt|gov)/issue-[0-9]+ ]]; then
        echo "❌ Error: Branch '$CURRENT_BRANCH' violates naming standard (feat|fix|debt|gov)/issue-X."
        exit 1
    fi

    # Check PR Marker (ADR-0037 Mandate)
    # Why: Enforces the 'Builder-to-Auditor' transition by requiring an audit log in the PR body.
    if gh pr view --json body > /dev/null 2>&1; then
        PR_BODY=$(gh pr view --json body -q '.body')
        if [[ ! "$PR_BODY" == *"## ⚔️ The Pharos Crucible (Audit Log)"* ]]; then
            echo "❌ Error: Pull Request body is missing the mandatory 'Pharos Crucible' audit log."
            exit 1
        fi
    fi

    # 8. PowerShell Installation Parity
    echo "   [Process] Verifying scripts/install.ps1 integrity..."
    if [ -f "scripts/install.ps1" ]; then
        bash scripts/validate-ps1.sh
    else
        echo "   ❌ Error: scripts/install.ps1 is missing."
        exit 1
    fi

    # 9. Installation Script Hardening
    echo "   [Process] Verifying installation script hardening..."
    ./scripts/podman-wrapper.sh "public.ecr.aws/docker/library/debian:bookworm-slim" \
        sh -c "apt-get update && apt-get install -y curl sudo && bash scripts/test-issue-93.sh"

    # 10. Dependency Isolation (wasm32)
    echo "   [Process] Verifying Dependency Isolation (wasm32)..."
    ./scripts/podman-wrapper.sh pkd-core-builder \
        sh -c "PROHIBITED='wasmtime|tokio|rayon' && \
        RESULTS=\$(cargo tree --package pkd-core --target wasm32-unknown-unknown --all-features | grep -E \"\$PROHIBITED\" || true) && \
        if [ -n \"\$RESULTS\" ]; then \
            echo \"   ❌ Error: Prohibited native dependencies detected in wasm32 target:\"; \
            exit 1; \
        fi"

    # 11. TDD Traceability (Beck Principle)
    echo "   [Process] Verifying TDD Traceability..."
    BASE_REF=${GITHUB_BASE_REF:-"main"}
    if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1 || git rev-parse --verify "origin/$BASE_REF" >/dev/null 2>&1; then
        if git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then COMPARE_REF="$BASE_REF"; else COMPARE_REF="origin/$BASE_REF"; fi
        if CHANGED_FILES=$(git diff --name-only "$COMPARE_REF...HEAD" 2>/dev/null); then
            if [[ "$CHANGED_FILES" == *"src/"* ]] && [[ ! "$CHANGED_FILES" == *"test"* ]]; then
                echo "⚠️ Warning: Changes to 'src/' detected without corresponding 'test' updates."
            fi
        fi
    fi

    echo "✅ [Slice: CORE] Verified."
}

# Why: Validates the .NET 8 Revit Bridge and cross-language FFI boundary.
run_bridge() {
    echo "🚀 [Slice: BRIDGE] Verifying .NET Revit Bridge & Handshake..."
    
    # We use the specialized Bridge Containerfile for isolation.
    podman build \
        --security-opt seccomp=unconfined \
        -t pkd-bridge-tester \
        --build-arg BUILD_MODE="$BUILD_MODE" \
        -f Containerfile.bridge .

    podman run --rm --security-opt seccomp=unconfined pkd-bridge-tester
    
    echo "✅ [Slice: BRIDGE] Verified."
}

# Why: Validates the Marketing Site (Astro) and frontend TypeScript audits.
run_marketing() {
    echo "🚀 [Slice: MARKETING] Verifying Astro Site & TS Audits..."

    # We use the TS Containerfile which handles Astro build and audits.
    podman build \
        --security-opt seccomp=unconfined \
        -t pkd-ts-auditor \
        --build-arg BUILD_MODE="$BUILD_MODE" \
        -f Containerfile.ts .

    echo "✅ [Slice: MARKETING] Verified."
}

# --- Execution ---

if [ -z "$SLICE" ]; then
    echo "🏁 Starting Full Monolithic Pulse (Local Dev Mode)"
    run_core
    run_bridge
    run_marketing
    echo "🎉 Full Pulse Complete: Pharos Green."
else
    case $SLICE in
        core) run_core ;;
        bridge) run_bridge ;;
        marketing) run_marketing ;;
        *) echo "❌ Error: Invalid slice '$SLICE'"; exit 1 ;;
    esac
fi
