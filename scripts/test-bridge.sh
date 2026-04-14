#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / CI
# File: test-bridge.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Zero-Host script to run Revit-to-Rust Bridge tests in Podman.
# ========================================================================

set -e

# Build the bridge test container with unconfined seccomp for the build phase
podman build --security-opt seccomp=unconfined -t pkd-bridge-tester -f Containerfile.bridge .

# Run the integration tests
podman run --rm \
    --security-opt seccomp=unconfined \
    pkd-bridge-tester
