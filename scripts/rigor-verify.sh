#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / Git Hooks
# File: rigor-verify.sh
# Author: PHAROS_DEV_CORE
# License: FSL-1.1
# Purpose: RET-03 Mid-Sprint Rigor Enforcer. 
# Logic: Checks if high-ECT tasks have completed a manual rigor check.
# Traceability: RET-03, Issue #160, ADR-0043
# ========================================================================

# Check for SESSION_CONTEXT.md in current dir or parent
CONTEXT_FILE="SESSION_CONTEXT.md"
if [ ! -f "$CONTEXT_FILE" ]; then
    # Search in sibling root if we are in a monorepo package
    CONTEXT_FILE="../../SESSION_CONTEXT.md"
fi

if [ ! -f "$CONTEXT_FILE" ]; then
    echo "🛡️  [RIGOR] No session context found. Skipping check."
    exit 0
fi

# Extract ECT value (look for exact word ECT followed by colon)
ECT=$(grep -i "\bECT:" "$CONTEXT_FILE" | awk '{print $NF}' | tr -d ' \r\n')

if [[ -z "$ECT" ]]; then
    echo "🛡️  [RIGOR] ECT not defined in context. Proceeding."
    exit 0
fi

if [ "$ECT" -ge 4 ]; then
    echo "🚨 [RIGOR] HIGH COMPLEXITY DETECTED (ECT: $ECT)"
    
    # Check for bypass (CI/CD or explicit override)
    if [[ "$RIGOR_CHECK_PASSED" == "true" ]]; then
        echo "🛡️  [RIGOR] Bypass active. Proceeding."
        exit 0
    fi

    # Interactive Prompt (only if terminal is attached)
    if [ -t 0 ]; then
        printf "⚠️  HAVE YOU COMPLETED THE MID-SPRINT RIGOR CHECK WITH THE SPM? (y/n): "
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo "🟢 [RIGOR] Check confirmed. Stay remarkable."
            exit 0
        else
            echo "❌ [RIGOR] Push aborted. Complete the rigor check before proceeding."
            exit 1
        fi
    else
        echo "❌ [RIGOR] Push blocked. ECT >= 4 requires an interactive rigor check or RIGOR_CHECK_PASSED=true."
        exit 1
    fi
fi

exit 0
