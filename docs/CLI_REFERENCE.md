<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Tooling
 * File: docs/CLI_REFERENCE.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Formal command reference for the Pharos Kitchen Design CLI (pkd).
 * Traceability: Issue #10, Issue #12, Issue #78, Issue #81, ADR-0006
 * ======================================================================== -->

# Pharos Kitchen Design CLI (pkd) Reference Guide

The `pkd` command-line tool is the primary control plane for the Pharos Kitchen Design ecosystem, providing designers and administrators with tools for metadata validation, identity management, and equipment discovery.

## 📦 Prerequisites

The `pkd` CLI utilizes the system's secure keyring to manage authentication tokens safely.

### 🐧 Linux
Linux systems require `libsecret` to interact with the Secret Service API (e.g., GNOME Keyring or KSecretService).
```bash
sudo apt update && sudo apt install -y libsecret-1-dev
```

### 🍎 macOS
If you are running a pre-compiled binary that is not yet notarized, the universal installer proactively authorizes the **Authoritative** binary. To manually clear the quarantine flag:
```bash
# Run this from the directory containing the pkd binary
xattr -d com.apple.quarantine pkd
```
The CLI utilizes the **macOS Keychain** for secure token storage.

### 🪟 Windows
The CLI utilizes the **Windows Credential Manager**. No additional system libraries are required.

## 🚀 Quick Start

Pharos Kitchen Design is designed for a low **Time to First Search (TTFS)**. After installing prerequisites, you can be searching the registry in seconds.

```bash
# 1. Login to the Pharos Identity Bridge
pkd auth login

# 2. Verify your current role
pkd auth whoami

# 3. Search: Discover equipment immediately using attribute-first syntax
pkd manufacturer=3m
```

---

## 🛠️ Command Reference

### `pkd auth`
Manages the designer's identity session.
- **`login`**: Initiates the RFC 8628 Device Authorization Flow.
- **`logout`**: Clears the local session and removes tokens from the system keyring.
- **`whoami`**: Displays the currently authenticated email and `PharosRole`.

### `pkd admin`
Administrative tools for user orchestration (Requires `ADMIN` or `AUDITOR` role).
- **`users list`**: Lists all registered users in the Cognito pool.
- **`users update --email <EMAIL> --role <ROLE>`**: Updates a user's Pharos role.
- **`users impersonate --email <EMAIL>`**: Sets the `X-Pharos-Impersonate` context for local API testing.

### `pkd core`
Metadata and registry operations.
- **`validate --path <PATH>`**: Validates a local metadata JSON file against the official PKD Schema.
- **`search <QUERY>`**: Executes an RFC 2378 compliant search against the equipment registry.


### `pkd gov` 
Governance and SDLC compliance tools. 
- **`lint`**: Executes the Pharos Governance Linter to ensure codebase compliance with high-rigor standards. 

#### Governance Rules (GOV-001 to GOV-006) 
- **GOV-001 (Standard Prologue)**: All source files (`.rs`, `.ts`, `.tsx`, `.js`, `.jsx`, `.astro`, `.json`) MUST include the standardized file prologue. 
- **GOV-002 (FSL-1.1 License)**: The prologue MUST explicitly reference the `FSL-1.1` license. 
- **GOV-003 (Traceability)**: The prologue MUST include a `Traceability:` field linked to a GitHub Issue or PRD. 
- **GOV-004 (ADR Naming)**: Architecture Decision Records (ADRs) in `docs/adr/` MUST follow the `\d{4}-filename.md` naming convention. 
- **GOV-005 (ADR Indexing)**: All ADRs MUST be indexed in the `docs/DECISION_LOG.md` master record. 
- **GOV-006 (SPM Mandate)**: The `GEMINI.md` file MUST contain a definition for the `Senior Program Manager (SPM)` role. 

> **Lean Shard Exception**: Runtime data shards (JSON files starting with `shard_` or located in `samples/`) are exempt from header requirements (GOV-001 through GOV-003) to maintain payload efficiency.
---

## 🔍 RFC 2378 Search Syntax
PKD implements an ergonomic, attribute-first search syntax designed for high-speed equipment selection. For a deep dive into advanced query options and wildcards, see the [Professional Search Guide](https://iamrichardd.com/pharos-kitchen-design/docs/user-guide).

### Basic Queries
- **Single Attribute**: `pkd core search manufacturer=hobart`
- **Multiple Attributes**: `pkd core search brand=vulcan voltage=208`
- **Positional Shortcut**: `pkd brand=vulcan voltage=208` (Default fallback to `core search`)

### Return Filters
You can specify which fields the registry should return for the matched equipment:
- `pkd core search manufacturer=3m return name,model,voltage`

---

## 🛑 Security & Fail Fast
The `pkd` CLI implements local **Fail Fast** security guards. 
- **Role Enforcement**: Administrative commands are guarded via the `Authorizable` trait. If your current session does not have the required role, the CLI will exit immediately before making network calls.
- **Validation**: All search queries are validated against the `PharosSchema` to ensure only supported "Lookup" fields are queried.
