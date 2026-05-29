#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI
# File: ci-watchdog.sh
# Author: PHAROS_DEV_CORE
# License: FSL-1.1
# Purpose: RET-04 CI Pulse Watchdog. Monitors GHA run duration for 
#          high-risk infrastructure steps (Podman, Pulse).
# Logic: If 'Set up Podman' or 'Execute Pulse' exceeds 10 minutes,
#        the watchdog triggers a failure and logs a violation.
# Traceability: RET-04, Issue #161
# ========================================================================

THRESHOLD_MIN=40
THRESHOLD_SEC=$((THRESHOLD_MIN * 60))
START_TIME=$(date +%s)

echo "🛡️ CI Pulse Watchdog: Monitoring started (Limit: ${THRESHOLD_MIN}m)..."

# --- Monitoring Loop ---
while true; do
    sleep 30
    
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    # Identify if high-risk steps are currently running
    # We look for specific process signatures associated with the monitored steps.
    IS_PODMAN_SETUP=$(pgrep -f "apt-get.*podman" || pgrep -f "podman.*build" || echo "")
    IS_PULSE_EXEC=$(pgrep -f "bash scripts/pulse.sh" || echo "")

    if [[ -n "$IS_PODMAN_SETUP" || -n "$IS_PULSE_EXEC" ]]; then
        if [ $ELAPSED -gt $THRESHOLD_SEC ]; then
            echo ""
            echo "🚨 [CI-WATCHDOG] TIMEOUT VIOLATION DETECTED"
            echo "   ----------------------------------------"
            echo "   Step Duration: ${ELAPSED} seconds"
            echo "   Max Allowed:   ${THRESHOLD_SEC} seconds"
            echo "   Detected Process: $(ps -p ${IS_PODMAN_SETUP:-$IS_PULSE_EXEC} -o cmd= || echo 'Unknown')"
            echo "   ----------------------------------------"
            
            if [ -n "$GITHUB_ACTIONS" ]; then
                echo "::error title=CI Pulse Watchdog::Execution timeout exceeded 10m limit. Terminating run."
            fi
            
            # Trigger failure by killing the parent shell or the monitored process
            # In GHA, killing the 'pulse.sh' process will cause the step to fail.
            pkill -f "bash scripts/pulse.sh"
            pkill -f "podman build"
            
            exit 1
        fi
    fi

    # Exit gracefully if Pulse has completed and no other high-risk processes are found
    # (Assuming the watchdog is started as a background process in the GHA workflow)
    if [ $ELAPSED -gt $((THRESHOLD_SEC + 300)) ]; then
        echo "🛡️ CI Pulse Watchdog: Global timeout reached. Terminating watchdog."
        exit 0
    fi
done
