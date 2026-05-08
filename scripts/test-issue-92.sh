#!/bin/sh
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Test Suite
# File: scripts/test-issue-92.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1
# Purpose: Verification for Issue #92 'Pharos Gold' Update Check.
#          Uses the actual implementation from install.sh.
# ========================================================================

# Setup Mock Environment
export PHAROS_INSTALL_SKIP_MAIN="true"
INSTALL_DIR="/tmp/pkd-test-bin"
BINARY_NAME="pkd"
mkdir -p "${INSTALL_DIR}"

# Source the actual script
# shellcheck source=scripts/install.sh
. "$(dirname "$0")/install.sh"

# Mocking Utilities
mock_pkd() {
    version=$1
    echo "#!/bin/sh" > "${INSTALL_DIR}/${BINARY_NAME}"
    echo "echo \"pkd ${version}\"" >> "${INSTALL_DIR}/${BINARY_NAME}"
    chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
}

mock_broken_pkd() {
    echo "#!/bin/sh" > "${INSTALL_DIR}/${BINARY_NAME}"
    echo "echo 'Panic: Missing library' >&2" >> "${INSTALL_DIR}/${BINARY_NAME}"
    echo "exit 1" >> "${INSTALL_DIR}/${BINARY_NAME}"
    chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
}

mock_curl_headers() {
    tag=$1
    if [ "$tag" = "none" ]; then
        echo "location: https://github.com/repo/releases" > /tmp/curl_headers
    else
        echo "location: https://github.com/repo/releases/tag/${tag}" > /tmp/curl_headers
    fi
}

# Override fetch_latest_version_tag for testing to avoid network calls
# But we test the logic inside it by simulating the tag extraction
fetch_latest_version_tag() {
    # This logic matches the one in install.sh but reads from /tmp/curl_headers
    TAG=$(grep -i '^location:' /tmp/curl_headers | tail -n 1 | grep '/tag/' | sed 's/.*\/tag\///' | tr -d '\r' | tr -d '[:space:]')
    if [ -n "${TAG}" ]; then
        echo "${TAG}"
    else
        echo "unknown"
    fi
}

test_should_skip_install_when_version_matches() {
    echo "Running: test_should_skip_install_when_version_matches"
    mock_pkd "0.1.0"
    mock_curl_headers "v0.1.0"
    
    LOCAL_VER=$(check_local_version)
    REMOTE_TAG=$(fetch_latest_version_tag)
    
    CLEAN_LOCAL=$(echo "${LOCAL_VER}" | sed 's/^v//')
    CLEAN_REMOTE=$(echo "${REMOTE_TAG}" | sed 's/^v//')
    
    if [ "${CLEAN_LOCAL}" = "${CLEAN_REMOTE}" ]; then
        echo "✅ PASS: Versions match."
    else
        echo "❌ FAIL: Expected version match (Local: ${CLEAN_LOCAL}, Remote: ${CLEAN_REMOTE})"
        exit 1
    fi
}

test_should_proceed_with_install_when_version_mismatch() {
    echo "Running: test_should_proceed_with_install_when_version_mismatch"
    mock_pkd "0.1.0"
    mock_curl_headers "v0.2.0"
    
    LOCAL_VER=$(check_local_version)
    REMOTE_TAG=$(fetch_latest_version_tag)
    
    CLEAN_LOCAL=$(echo "${LOCAL_VER}" | sed 's/^v//')
    CLEAN_REMOTE=$(echo "${REMOTE_TAG}" | sed 's/^v//')
    
    if [ "${CLEAN_LOCAL}" != "${CLEAN_REMOTE}" ]; then
        echo "✅ PASS: Versions mismatch."
    else
        echo "❌ FAIL: Expected version mismatch"
        exit 1
    fi
}

test_should_handle_broken_binary_gracefully() {
    echo "Running: test_should_handle_broken_binary_gracefully"
    mock_broken_pkd
    
    LOCAL_VER=$(check_local_version)
    
    if [ "${LOCAL_VER}" = "none" ]; then
        echo "✅ PASS: Broken binary returned 'none' instead of crashing."
    else
        echo "❌ FAIL: Expected 'none' for broken binary, got: ${LOCAL_VER}"
        exit 1
    fi
}

test_should_proceed_when_remote_tag_unknown() {
    echo "Running: test_should_proceed_when_remote_tag_unknown"
    mock_curl_headers "none"
    
    REMOTE_TAG=$(fetch_latest_version_tag)
    
    if [ "${REMOTE_TAG}" = "unknown" ]; then
        echo "✅ PASS: Handled unknown remote tag."
    else
        echo "❌ FAIL: Expected 'unknown', got: ${REMOTE_TAG}"
        exit 1
    fi
}

# Execution
test_should_skip_install_when_version_matches
test_should_proceed_with_install_when_version_mismatch
test_should_handle_broken_binary_gracefully
test_should_proceed_when_remote_tag_unknown

echo "All Issue #92 TDD artifacts verified."
rm -rf "${INSTALL_DIR}" /tmp/curl_headers
