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

echo "✅ Pulse Complete: Ecosystem Stability Verified."
