#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / Tooling
# File: scripts/test-quoting.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Atomic verification of Podman argument quoting and shell integrity.
# Traceability: Issue #41, Crucible Audit Remediation (Strike 2)
# ========================================================================

set -e

# Test Case: Verifying that spaces in arguments are preserved across the FFI boundary (Host -> Container)
EXPECTED="PHAROS_QUOTING_TEST_PASSED"

# Use authoritative public image (ADR-0014) to ensure CI parity.
# We use the same Rust image required by pulse.sh to optimize caching.
AUTH_IMAGE="public.ecr.aws/docker/library/rust@sha256:70aebe351faa35667ef36508deb19fe234ff03d67cfe102f095d920a53d0622c"

ACTUAL=$(bash scripts/podman-wrapper.sh "$AUTH_IMAGE" sh -c "echo 'PHAROS_QUOTING_TEST_PASSED'")

if [ "$ACTUAL" == "$EXPECTED" ]; then
    echo "🟢 [PASS] Podman-Wrapper Argument Quoting Verified."
    exit 0
else
    echo "🔴 [FAIL] Podman-Wrapper Quoting Error."
    echo "Expected: $EXPECTED"
    echo "Actual:   $ACTUAL"
    exit 1
fi
