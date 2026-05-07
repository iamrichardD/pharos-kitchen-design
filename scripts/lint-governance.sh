#!/usr/bin/env bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Governance
# File: scripts/lint-governance.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Enforce SDLC standards (Issue Authority, SPM role existence).
# Traceability: Issue #100
# ========================================================================

set -e

echo "   [Governance] Running Pharos Governance Audit..."

# 1. Check for SPM Role in GEMINI.md
if ! grep -q "Senior Program Manager (SPM)" GEMINI.md; then
    echo "      ❌ FAILED: SPM Role not defined in GEMINI.md"
    exit 1
fi

# 2. Check for ADR-0028 in DECISION_LOG.md
if ! grep -q "ADR-0028" docs/DECISION_LOG.md; then
    echo "      ❌ FAILED: ADR-0028 (SPM Role) not indexed in docs/DECISION_LOG.md"
    exit 1
fi

# 3. Check for mandatory prologues in ADR files
echo "   [Governance] Verifying ADR file prologues..."
for f in docs/adr/*.md; do
    if ! head -n 10 "$f" | grep -q "Project: Pharos Kitchen Design (Project Prism)"; then
        echo "      ❌ FAILED: Missing or malformed prologue in $f"
        exit 1
    fi
done

echo "   [Governance] Pharos Green: Governance Standards Verified."
exit 0
