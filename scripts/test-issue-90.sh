#!/bin/sh
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Testing / Installation
# File: scripts/test-issue-90.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Verification script for Issue #90 (check_writable logic).
#          Tests that the installer fails fast when the target directory 
#          is not writable.
# Traceability: Issue #90
# ========================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo "[INFO] $1"; }
log_error() { echo "[ERROR] $1"; }

# 1. Setup Environment
TMP_BASE=$(mktemp -d)
trap 'rm -rf "${TMP_BASE}"' EXIT

READONLY_DIR="${TMP_BASE}/readonly"
mkdir -p "${READONLY_DIR}"
chmod 555 "${READONLY_DIR}"

log_info "Created read-only directory: ${READONLY_DIR}"

# 2. Test Execution (Source install.sh)
# We expect check_writable to return 1 (failure) or exit the script.
# Since we want to test the 'Fail Fast' behavior, we'll run it in a subshell.

export PHAROS_INSTALL_SKIP_MAIN=true
. ./scripts/install.sh

log_info "Testing check_writable on read-only directory as non-root user..."

# Create a non-root user
addgroup -S pharos 2>/dev/null || true
adduser -S pharos -G pharos 2>/dev/null || true
chown pharos:pharos "${TMP_BASE}"

# Check if 'sudo' is available in this container (it shouldn't be for the negative test)
if command -v sudo >/dev/null 2>&1; then
    log_warn "Sudo detected. Moving it aside for the negative test..."
    mv "$(command -v sudo)" /tmp/sudo_backup
fi

if su pharos -s /bin/sh -c ". ./scripts/install.sh && check_writable ${READONLY_DIR}"; then
    log_error "Test Failed: check_writable succeeded on a read-only directory!"
    exit 1
else
    log_info "Test Passed: check_writable failed on read-only directory (as expected)."
fi

# Restore sudo if we moved it
if [ -f /tmp/sudo_backup ]; then
    mv /tmp/sudo_backup /usr/bin/sudo || mv /tmp/sudo_backup /usr/local/bin/sudo
fi
