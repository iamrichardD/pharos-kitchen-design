#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Security / Audit
# File: apps/marketing/scripts/verify-sri.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Fail Fast verification of third-party script integrity.
# Traceability: Priority 2, Issue #29
# Hash Update: 2026-06-05 (Upstream Umami script update)
# ========================================================================

EXPECTED_HASH="5JcQy/9LRKyhvuBM7GtQLapupfuXu7eHv8iOknpibxz0xAsHWOzir7n8DgyaNjJW"
URL="https://cloud.umami.is/script.js"

echo "Checking script integrity for $URL..."
ACTUAL_HASH=$(curl -s $URL | openssl dgst -sha384 -binary | openssl base64 -A)

if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
    echo "FAIL-FAST: Umami SRI Mismatch!"
    echo "Expected: $EXPECTED_HASH"
    echo "Actual:   $ACTUAL_HASH"
    exit 1
fi

echo "SRI Verified Successfully."
exit 0
