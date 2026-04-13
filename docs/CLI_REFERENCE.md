/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Tooling
 * File: docs/CLI_REFERENCE.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Formal command reference for the Pharos CLI (pkd).
 * Traceability: Issue #10, Issue #12, ADR-0006
 * ======================================================================== */

# Pharos CLI (pkd) Reference Guide

The `pkd` command-line tool is the primary control plane for the Pharos ecosystem, providing designers and administrators with tools for metadata validation, identity management, and equipment discovery.

## 🚀 Quick Start
```bash
# Login to the Pharos Identity Bridge
pkd auth login

# Verify your current role
pkd auth whoami

# Search the equipment registry
pkd core search manufacturer=3m
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
- **`validate --path <PATH>`**: Validates a local metadata JSON file against the official Pharos Schema.
- **`search <QUERY>`**: Executes an RFC 2378 compliant search against the equipment registry.

---

## 🔍 RFC 2378 Search Syntax
Pharos implements an ergonomic, attribute-first search syntax designed for high-speed equipment selection.

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
