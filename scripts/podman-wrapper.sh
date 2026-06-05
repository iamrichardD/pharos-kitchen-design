#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / Tooling
# File: scripts/podman-wrapper.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: High-rigor Podman wrapper to ensure environment parity and 
#          bypass shell-injection constraints safely.
# Traceability: ADR-0014, Strategic Workflow Optimization
# ========================================================================

set -e

# Fail Fast: Ensure we have at least one argument (the image)
if [ $# -lt 1 ]; then
    echo "❌ Error: Missing arguments."
    echo "Usage: $0 <image> [command...]"
    echo "Example: $0 public.ecr.aws/docker/library/alpine:latest sh"
    exit 1
fi

IMAGE=$1
shift

# Determine the absolute path of the workspace root via git
# This ensures the mount works correctly regardless of where the script is called from.
WORKSPACE_ROOT=$(git rev-parse --show-toplevel)

# Execute podman with mandated Pharos security and volume flags (ADR-0014)
# -v: Mounts the entire workspace to /work with SELinux labels (:z)
# -w: Sets the container working directory to /work
# --security-opt: Required for certain WASM/Rust build operations
podman run --rm \
    --security-opt seccomp=unconfined \
    --dns 1.1.1.1 \
    -v "${WORKSPACE_ROOT}:/work:z" \
    -w /work \
    "$IMAGE" \
    "$@"
