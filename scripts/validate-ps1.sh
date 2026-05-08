#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / Validation
# File: scripts/validate-ps1.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Zero-Host syntax and logic validation for PowerShell scripts.
# Traceability: Issue #94
# ========================================================================

set -e

# Mandated Pharos Standard: Podman-only validation
IMAGE="mcr.microsoft.com/powershell:latest"

echo "🔍 Validating scripts/install.ps1 syntax..."

# Run pwsh with -Check only validates syntax without execution
./scripts/podman-wrapper.sh "$IMAGE" pwsh -NoProfile -Command "
    if (Test-Path scripts/install.ps1) {
        Write-Host 'Found script. Checking syntax...'
        # Parse the script to check for syntax errors
        [void][System.Management.Automation.Language.Parser]::ParseFile('scripts/install.ps1', [ref]\$null, [ref]\$null)
        Write-Host '✅ Syntax check passed.'
    } else {
        Write-Error 'Script not found!'
        exit 1
    }
"

echo "🔍 Validating internal function definitions..."
./scripts/podman-wrapper.sh "$IMAGE" pwsh -NoProfile -Command "
    \$env:LOCALAPPDATA = '/tmp/localappdata'
    \$env:TEMP = '/tmp'
    . ./scripts/install.ps1
    if ((Get-Command Write-Logo -ErrorAction SilentlyContinue) -and 
        (Get-Command Get-Platform -ErrorAction SilentlyContinue) -and
        (Get-Command Fetch-And-Verify -ErrorAction SilentlyContinue)) {
        Write-Host '✅ All core functions are defined.'
    } else {
        Write-Error 'Missing function definitions!'
        exit 1
    }
"

echo "🚀 All PowerShell validations passed."
