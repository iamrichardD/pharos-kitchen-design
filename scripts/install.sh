#!/bin/sh
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Installation Utility
# File: scripts/install.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Universal installer for the pkd-core CLI. Implements a 
#          high-rigor environment audit and SHA-256 verification.
# Traceability: Issue #77, Bug #81, ADR-0006
# ========================================================================

set -e

# Branding & Colors
BOLD='\033[1m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default Configuration
BINARY_NAME="pkd"
INSTALL_DIR="/usr/local/bin"
FORCE_INSTALL=false
REPO_URL="https://github.com/iamrichardD/pharos-kitchen-design"
LATEST_RELEASE_URL="${REPO_URL}/releases/latest/download"

# Logging Utilities
log_info() {
    printf "${BLUE}[INFO]${NC} %s\n" "$1"
}

log_warn() {
    printf "${ORANGE}[WARN]${NC} %s\n" "$1"
}

log_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
}

print_banner() {
    printf "${BLUE}${BOLD}"
    printf "   ___ _                     \n"
    printf "  / _ \ |__   __ _ _ __ ___  ___ \n"
    printf " / /_)/ '_ \ / _\` | '__/ _ \/ __|\n"
    printf "/ ___/| | | | (_| | | | (_) \__ \\\n"
    printf "\/    |_| |_|\__,_|_|  \___/|___/\n"
    printf "                                 \n"
    printf " PHAROS KITCHEN DESIGN (PKD)     \n"
    printf " Universal Installation Utility  \n"
    printf "${NC}\n"
}

show_help() {
    echo "Usage: install.sh [options]"
    echo ""
    echo "Options:"
    echo "  -f, --force    Bypass environment audit and dependency checks."
    echo "  -h, --help     Show this help message."
    echo ""
    echo "Environment Variables:"
    echo "  INSTALL_DIR    Override the installation directory (default: /usr/local/bin)"
}

# Parse Arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
        -f|--force) FORCE_INSTALL=true; shift ;;
        -h|--help) show_help; exit 0 ;;
        *) log_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

# Platform Detection
detect_platform() {
    OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
    ARCH="$(uname -m)"

    case "${OS}" in
        linux)
            PLATFORM="linux"
            ;;
        darwin)
            PLATFORM="macos"
            ;;
        *)
            log_error "Unsupported Operating System: ${OS}"
            exit 1
            ;;
    esac

    case "${ARCH}" in
        x86_64|amd64)
            TARGET_ARCH="x86_64"
            ;;
        arm64|aarch64)
            TARGET_ARCH="arm64"
            ;;
        *)
            log_error "Unsupported Architecture: ${ARCH}"
            exit 1
            ;;
    esac

    log_info "Platform Detected: ${PLATFORM} (${TARGET_ARCH})"
}

# Environment Audit (Fail-Fast)
audit_environment() {
    log_info "Performing environment audit..."
    
    MISSING_DEPS=""

    # Check for basic utilities
    for cmd in curl tar; do
        if ! command -v "${cmd}" >/dev/null 2>&1; then
            MISSING_DEPS="${MISSING_DEPS} ${cmd}"
        fi
    done

    # Check for SHA-256 utility
    if ! command -v sha256sum >/dev/null 2>&1 && ! command -v shasum >/dev/null 2>&1; then
        MISSING_DEPS="${MISSING_DEPS} sha256sum/shasum"
    fi

    # Linux-specific check: libsecret
    if [ "${PLATFORM}" = "linux" ]; then
        if ! ldconfig -p | grep -q "libsecret-1.so"; then
            log_warn "libsecret-1 not found in ldconfig. Checking common paths..."
            if [ ! -f /usr/lib/x86_64-linux-gnu/libsecret-1.so.0 ] && [ ! -f /usr/lib/libsecret-1.so.0 ] && [ ! -f /usr/lib64/libsecret-1.so.0 ]; then
                log_error "Missing dependency: libsecret-1 (required for secure token storage)"
                echo "   👉 Fix (Ubuntu/Debian): sudo apt-get install -y libsecret-1-dev"
                echo "   👉 Fix (Fedora): sudo dnf install libsecret-devel"
                echo "   👉 Fix (Arch): sudo pacman -S libsecret"
                if [ "${FORCE_INSTALL}" = false ]; then
                    exit 1
                fi
            fi
        fi
    fi

    if [ -n "${MISSING_DEPS}" ]; then
        log_error "The following dependencies are missing:${MISSING_DEPS}"
        if [ "${FORCE_INSTALL}" = false ]; then
            log_error "Please install these utilities and try again, or use -f to bypass."
            exit 1
        else
            log_warn "Bypassing missing dependencies due to --force flag."
        fi
    fi

    log_info "Environment audit passed."
}

# Binary Acquisition & Integrity
fetch_and_verify() {
    log_info "Fetching pkd-core artifact..."

    # Construct artifact name: e.g., pkd-core-linux-x86_64.tar.gz
    ARTIFACT_NAME="pkd-core-${PLATFORM}-${TARGET_ARCH}.tar.gz"
    DOWNLOAD_URL="${LATEST_RELEASE_URL}/${ARTIFACT_NAME}"
    CHECKSUM_URL="${DOWNLOAD_URL}.sha256"

    TMP_DIR="$(mktemp -d)"
    trap 'rm -rf "${TMP_DIR}"' EXIT

    log_info "Downloading ${ARTIFACT_NAME}..."
    if ! curl -sSLf "${DOWNLOAD_URL}" -o "${TMP_DIR}/${ARTIFACT_NAME}"; then
        log_error "Failed to download binary from ${DOWNLOAD_URL}"
        exit 1
    fi

    log_info "Downloading checksum..."
    if ! curl -sSLf "${CHECKSUM_URL}" -o "${TMP_DIR}/${ARTIFACT_NAME}.sha256"; then
        log_error "Mandatory checksum file not found at ${CHECKSUM_URL}"
        log_error "Integrity cannot be verified. Aborting for your safety."
        if [ "${FORCE_INSTALL}" = false ]; then
            exit 1
        fi
        log_warn "Proceeding without verification due to --force flag."
    else
        log_info "Verifying SHA-256 checksum..."
        (
            cd "${TMP_DIR}"
            if command -v sha256sum >/dev/null 2>&1; then
                sha256sum -c "${ARTIFACT_NAME}.sha256"
            else
                shasum -a 256 -c "${ARTIFACT_NAME}.sha256"
            fi
        ) || {
            log_error "SHA-256 verification failed!"
            exit 1
        }
        log_info "Checksum verified."
    fi

    log_info "Extracting artifact..."
    tar -xzf "${TMP_DIR}/${ARTIFACT_NAME}" -C "${TMP_DIR}"
    EXTRACTED_BINARY="${TMP_DIR}/pkd"
}

# Installation Logic
install_binary() {
    log_info "Installing binary to ${INSTALL_DIR}..."

    if [ ! -d "${INSTALL_DIR}" ]; then
        log_warn "Installation directory ${INSTALL_DIR} does not exist. Creating..."
        sudo mkdir -p "${INSTALL_DIR}"
    fi

    if ! sudo mv "${EXTRACTED_BINARY}" "${INSTALL_DIR}/${BINARY_NAME}"; then
        log_error "Failed to move binary to ${INSTALL_DIR}. Do you have sudo privileges?"
        exit 1
    fi

    sudo chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
    log_info "Binary installed successfully at ${INSTALL_DIR}/${BINARY_NAME}"
}

# macOS Security Flow
macos_security_authorization() {
    if [ "${PLATFORM}" = "macos" ]; then
        log_info "Performing macOS Security Audit..."
        BINARY_PATH="${INSTALL_DIR}/${BINARY_NAME}"
        
        if xattr "${BINARY_PATH}" 2>/dev/null | grep -q "com.apple.quarantine"; then
            log_warn "macOS Quarantine flag detected."
            echo "   As an independent project, PKD requires manual authorization."
            echo "   Removing quarantine flag to allow execution..."
            if sudo xattr -d com.apple.quarantine "${BINARY_PATH}" 2>/dev/null; then
                log_info "Security authorization successful."
            else
                log_error "Failed to remove quarantine flag automatically."
                echo "   👉 Fix: sudo xattr -d com.apple.quarantine ${BINARY_PATH}"
            fi
        fi
    fi
}

# Main Execution Flow
main() {
    print_banner
    log_info "Initializing Pharos Installation Environment..."
    
    detect_platform
    audit_environment
    fetch_and_verify
    install_binary
    macos_security_authorization
    
    log_info "Installation complete. Stay remarkable."
    "${INSTALL_DIR}/${BINARY_NAME}" --version || log_warn "Verification command failed. Ensure ${INSTALL_DIR} is in your PATH."
}

main "$@"
