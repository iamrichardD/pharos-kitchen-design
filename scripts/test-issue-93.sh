#!/bin/sh
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Testing / Installation
# File: scripts/test-issue-93.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Verification script for Issue #93 (uninstall path).
#          Tests that --uninstall correctly removes the binary.
# Traceability: Issue #93
# ========================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo "[INFO] $1"; }
log_error() { echo "[ERROR] $1"; }

# 1. Setup Environment
export PHAROS_INSTALL_SKIP_MAIN=true
. ./scripts/install.sh

TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

BINARY_PATH="${TMP_DIR}/pkd"
touch "${BINARY_PATH}"
chmod +x "${BINARY_PATH}"

log_info "Simulating installation at ${BINARY_PATH}"
if [ ! -f "${BINARY_PATH}" ]; then
    log_error "Failed to create mock binary."
    exit 1
fi

# 2. Test Uninstallation
log_info "Testing uninstallation..."
# Override INSTALL_DIR for the test
INSTALL_DIR="${TMP_DIR}"
UNINSTALL_MODE=true

# We call the function directly
uninstall_binary

if [ ! -f "${BINARY_PATH}" ]; then
    log_info "Test Passed: Binary successfully removed."
else
    log_error "Test Failed: Binary still exists."
    exit 1
fi

# 3. Test Non-existent Uninstallation
log_info "Testing uninstallation when binary is missing..."
uninstall_binary
log_info "Test Passed: Gracefully handled missing binary."
