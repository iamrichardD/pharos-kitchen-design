#!/bin/sh
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: Installation Utility
# File: scripts/install.sh
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Universal installer for the pkd-core CLI. Implements a 
#          high-rigor environment audit and SHA-256 verification.
# Traceability: Issue #77, Bug #81, ADR-0006, Issue #90
# ========================================================================

set -e

# Branding & Colors
BOLD='\033[1m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default Configuration
BINARY_NAME="${BINARY_NAME:-pkd}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
FORCE_INSTALL="${FORCE_INSTALL:-false}"
TARGET_VERSION=""
REPO_URL="https://github.com/iamrichardD/pharos-kitchen-design"
LATEST_RELEASE_URL="${REPO_URL}/releases/latest/download"

# Global state for sudo requirement (ADR-0014)
USE_SUDO=false

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
    echo "  -v, --version  Specify a version to install (e.g., v1.0.0)."
    echo "  -f, --force    Bypass environment audit and dependency checks."
    echo "  -h, --help     Show this help message."
    echo ""
    echo "Environment Variables:"
    echo "  INSTALL_DIR    Override the installation directory (default: /usr/local/bin)"
}

# Parse Arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
        -v|--version) TARGET_VERSION="$2"; shift 2 ;;
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

# Pharos Gold: Local Version Discovery
check_local_version() {
    BINARY_PATH="${INSTALL_DIR}/${BINARY_NAME}"
    if [ -x "${BINARY_PATH}" ]; then
        # We capture raw output in a variable before piping to awk.
        # This prevents the 'pipe-masking' anti-pattern where a failure in 
        # the binary would be hidden by the success of the awk command.
        RAW_VER=$("${BINARY_PATH}" --version 2>/dev/null) || RAW_VER=""
        CURRENT_VERSION=$(echo "${RAW_VER}" | awk '{print $2}')
        echo "${CURRENT_VERSION:-none}"
    elif command -v "${BINARY_NAME}" >/dev/null 2>&1; then
        RAW_VER=$("${BINARY_NAME}" --version 2>/dev/null) || RAW_VER=""
        CURRENT_VERSION=$(echo "${RAW_VER}" | awk '{print $2}')
        echo "${CURRENT_VERSION:-none}"
    else
        echo "none"
    fi
}

# Pharos Gold: Remote Version Discovery (Header Redirect)
fetch_latest_version_tag() {
    # Why: We use a header-redirect strategy to identify the latest version 
    #      without incurring GitHub API rate limits for unauthenticated users.
    #      This ensures sub-second environment verification and idempotency.
    
    LATEST_URL="${REPO_URL}/releases/latest"
    
    # We fetch headers and extract the 'location' line.
    HEADERS=$(curl -sSLI --connect-timeout 5 --max-time 10 "${LATEST_URL}" 2>/dev/null)
    LOCATION=$(echo "${HEADERS}" | grep -i '^location:' | tail -n 1)
    
    # Security [SEC-92-001]: Validate that the redirect location is within 
    # the authoritative GitHub releases domain before parsing the tag.
    case "${LOCATION}" in
        *"github.com/"*"/releases/tag/"*)
            TAG=$(echo "${LOCATION}" | sed 's/.*\/tag\///' | tr -d '\r' | tr -d '[:space:]')
            ;;
        *)
            TAG=""
            ;;
    esac
    
    if [ -n "${TAG}" ]; then
        echo "${TAG}"
    else
        echo "unknown"
    fi
}

# Pharos Gold: Update Check Logic
check_update() {
    if [ "${FORCE_INSTALL}" = true ]; then
        log_info "Bypassing update check (--force)."
        return 0
    fi

    if [ -n "${TARGET_VERSION}" ]; then
        log_info "Bypassing 'Pharos Gold' update check (Version pinned to ${TARGET_VERSION})."
        return 0
    fi

    log_info "Performing 'Pharos Gold' update check..."
    
    LOCAL_VER=$(check_local_version)
    REMOTE_TAG=$(fetch_latest_version_tag)

    if [ "${REMOTE_TAG}" = "unknown" ]; then
        log_warn "Could not determine latest remote version. Proceeding with installation."
        return 0
    fi

    if [ "${LOCAL_VER}" = "none" ]; then
        log_info "No local installation found. Proceeding with fresh install."
        return 0
    fi

    # Clean versions (remove 'v' prefix if present for comparison)
    CLEAN_LOCAL=$(echo "${LOCAL_VER}" | sed 's/^v//')
    CLEAN_REMOTE=$(echo "${REMOTE_TAG}" | sed 's/^v//')

    log_info "Local version: ${LOCAL_VER}"
    log_info "Remote version: ${REMOTE_TAG}"

    if [ "${CLEAN_LOCAL}" = "${CLEAN_REMOTE}" ]; then
        printf "${BLUE}[INFO]${NC} ${BOLD}Pharos Gold: Already up-to-date.${NC}\n"
        log_info "Stay remarkable."
        exit 0
    fi

    log_info "Update available: ${LOCAL_VER} -> ${REMOTE_TAG}"
}

# Environment Audit (Fail-Fast)
check_writable() {
    local target_dir="$1"
    log_info "Verifying writability of ${target_dir}..."

    # We use a transactional write/remove test to bypass false positives 
    # from [ -w ] on certain network-mounted filesystems (NFS/SMB).
    local test_file
    test_file="${target_dir}/.pharos_write_test_$(date +%s)"
    
    # 1. Direct Check
    if [ -d "${target_dir}" ]; then
        if touch "${test_file}" 2>/dev/null; then
            rm -f "${test_file}"
            log_info "Directory is writable."
            USE_SUDO=false
            return 0
        fi
    fi

    # 2. Parent Check (for creation)
    if [ ! -d "${target_dir}" ]; then
        local parent_dir
        parent_dir=$(dirname "${target_dir}")
        while [ ! -d "${parent_dir}" ] && [ "${parent_dir}" != "/" ]; do
            parent_dir=$(dirname "${parent_dir}")
        done
        
        test_file="${parent_dir}/.pharos_write_test_$(date +%s)"
        if touch "${test_file}" 2>/dev/null; then
            rm -f "${test_file}"
            log_info "Parent directory ${parent_dir} is writable. No sudo needed for creation."
            USE_SUDO=false
            return 0
        fi
    fi

    # 3. Sudo Awareness
    if command -v sudo >/dev/null 2>&1; then
        log_warn "Installation directory is not writable by current user. Sudo will be required."
        USE_SUDO=true
        return 0
    fi

    log_error "Installation directory is not writable and 'sudo' is not available: ${target_dir}"
    return 1
}

audit_environment() {
    log_info "Performing environment audit..."
    
    check_writable "${INSTALL_DIR}" || {
        if [ "${FORCE_INSTALL}" = false ]; then
            exit 1
        fi
        log_warn "Bypassing writability check due to --force flag."
    }

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
    
    if [ -n "${TARGET_VERSION}" ]; then
        DOWNLOAD_URL="${REPO_URL}/releases/download/${TARGET_VERSION}/${ARTIFACT_NAME}"
        log_info "Target Version: ${TARGET_VERSION}"
    else
        DOWNLOAD_URL="${LATEST_RELEASE_URL}/${ARTIFACT_NAME}"
    fi
    
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

    local SUDO_CMD=""
    if [ "${USE_SUDO}" = true ]; then
        SUDO_CMD="sudo"
    fi

    if [ ! -d "${INSTALL_DIR}" ]; then
        log_warn "Installation directory ${INSTALL_DIR} does not exist. Creating..."
        ${SUDO_CMD} mkdir -p "${INSTALL_DIR}"
    fi

    if ! ${SUDO_CMD} mv "${EXTRACTED_BINARY}" "${INSTALL_DIR}/${BINARY_NAME}"; then
        log_error "Failed to move binary to ${INSTALL_DIR}. Check permissions."
        exit 1
    fi

    ${SUDO_CMD} chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
    log_info "Binary installed successfully at ${INSTALL_DIR}/${BINARY_NAME}"
}

# PATH Audit & Shell Integration
path_audit() {
    log_info "Auditing environment PATH..."
    
    # Normalize INSTALL_DIR to remove trailing slash
    NORMALIZED_INSTALL_DIR=$(echo "${INSTALL_DIR}" | sed 's:/*$::')

    case ":${PATH}:" in
        *:"${NORMALIZED_INSTALL_DIR}":*)
            log_info "PATH audit passed: ${INSTALL_DIR} is in your PATH."
            ;;
        *)
            log_warn "${INSTALL_DIR} is NOT in your PATH."
            
            # Detect shell and profile
            USER_SHELL=$(basename "${SHELL:-sh}")
            log_info "Shell detected: ${USER_SHELL}"
            
            case "${USER_SHELL}" in
                bash)
                    PROFILE_FILE="${HOME}/.bashrc"
                    [ "${PLATFORM}" = "macos" ] && PROFILE_FILE="${HOME}/.bash_profile"
                    ;;
                zsh)
                    PROFILE_FILE="${HOME}/.zshrc"
                    ;;
                fish)
                    PROFILE_FILE="${HOME}/.config/fish/config.fish"
                    ;;
                *)
                    PROFILE_FILE="${HOME}/.profile"
                    ;;
            esac

            echo ""
            echo "   ${BOLD}Action Required:${NC}"
            echo "   To use '${BINARY_NAME}' from any terminal, add it to your PATH:"
            echo ""

            # Check if it's already in the profile but not in the current PATH
            if [ -f "${PROFILE_FILE}" ] && grep -q "${NORMALIZED_INSTALL_DIR}" "${PROFILE_FILE}"; then
                log_info "PATH configuration found in ${PROFILE_FILE} but may not be active."
                echo "   👉 Run: ${BOLD}source ${PROFILE_FILE}${NC}"
            else
                if [ "${USER_SHELL}" = "fish" ]; then
                    echo "   👉 Run: ${BOLD}echo 'set -U fish_user_paths ${NORMALIZED_INSTALL_DIR} \$fish_user_paths' >> ${PROFILE_FILE}${NC}"
                else
                    echo "   👉 Run: ${BOLD}echo 'export PATH=\"${NORMALIZED_INSTALL_DIR}:\$PATH\"' >> ${PROFILE_FILE}${NC}"
                fi
                echo "   👉 Then: ${BOLD}source ${PROFILE_FILE}${NC}"
            fi
            echo ""
            ;;
    esac
}

# macOS Security Flow
macos_security_authorization() {
    # Why: Independent BIM content often triggers the macOS quarantine flag (Gatekeeper).
    #      We proactively remove this flag for authorized PKD binaries to ensure a 
    #      seamless "First-Run" experience for kitchen designers while providing 
    #      clear manual instructions should the automatic process fail.
    
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
    check_update
    audit_environment
    fetch_and_verify
    install_binary
    macos_security_authorization
    path_audit
    
    log_info "Installation complete. Stay remarkable."
    "${INSTALL_DIR}/${BINARY_NAME}" --version || log_warn "Verification command failed. Ensure ${INSTALL_DIR} is in your PATH."
}

if [ "${PHAROS_INSTALL_SKIP_MAIN}" != "true" ]; then
    main "$@"
fi
