/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0024-rfc2378-library-extraction.md
 * Status: Proposed
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Strategy for extracting RFC 2378 logic into a shared Rust crate.
 * Traceability: ADR 0023, RFC 2378, pharos-server/src/protocol.rs
 * ======================================================================== */

# ADR 0024: Shared RFC 2378 Protocol Library Extraction

## Context
As **Project Prism (pharos-kitchen-design)** evolves, we have identified a significant crossover with the sibling **pharos** project regarding the RFC 2378 protocol. Currently, protocol parsing, command AST definitions, and wildcard matching logic are duplicated or independently implemented. To maintain **Metadata-First Truth** and reduce "toil-heavy" code duplication, we require a unified, audited implementation of the protocol.

## Decision
We will extract the core RFC 2378 implementation into a standalone Rust crate, tentatively named `rfc2378-rs` or `pharos-protocol`. This crate will serve as the "Single Source of Truth" for all Pharos-compliant communications.

### 1. Library Interface & Scope
The library will expose the following core modules:
- **`lexer`**: A robust tokenizer handling whitespace, double quotes, and escape sequences (`\n`, `\t`, `\"`, `\\`).
- **`parser`**: A stateless parser that converts tokens into a `Command` Abstract Syntax Tree (AST).
- **`ast`**: Definitions for standard commands (`status`, `siteinfo`, `fields`, `id`, `login`, `logout`, `add`, `query`, `delete`, `change`) and Pharos-specific extensions (`auth`, `auth-check`).
- **`wildcard`**: A generalized implementation of RFC 2378 wildcard matching logic (`*` for zero-or-more, `+` for one-or-more, `?` for exactly one, and `[set]` for character sets).
- **`format`**: Standardized human-readable formatting for bytes (KB/MB/GB) and ISO timestamps.
- **`codes`**: Constants and semantic wrappers for RFC 2378 result codes (100-699).

### 2. Implementation Requirements
- **Fail Fast**: The parser must return informative error messages with context (e.g., "Syntax error at token 4: unclosed double quote").
- **Zero-Allocation (Preferred)**: Where possible, use `&str` and lifetimes to minimize allocation overhead during parsing.
- **WASM Support**: The crate must compile to `wasm32-unknown-unknown` to support use in the Pharos Web Registry and Revit Embedded Bridge.

### 3. Integration Path
1.  **Refactor `pharos-server` & `mdb`**: These legacy components will be updated to depend on the shared crate, eliminating internal protocol modules.
2.  **Enhance `pkd-cli`**: Integrate the crate to support "Spotlight-Ergonomic" search queries (e.g., `pkd manufacturer=3m return name`).
3.  **Schema Enforcement**: The library will provide hooks for `pkd-core` to enforce RFC 2378 attributes (e.g., `Lookup`, `Indexed`) during the parsing phase.

## Rationale
- **Architectural Consolidation**: Reduces the maintenance surface area. A security fix in the lexer automatically benefits all CLI and Server components.
- **Ergonomics**: Directly enables high-value search syntax for designers without duplicating complex parsing logic.
- **Interoperability**: Ensures that every tool in the ecosystem speaks the exact same "Language of Truth," eliminating the "Hallucination Gap" caused by protocol mismatches.

## Impact
- **Maintenance**: Requires a one-time breaking refactor of existing Rust projects.
- **Quality**: Elevates the protocol implementation to a first-class, independently tested component.
- **Security**: Centralizes the audit of the "Attack Surface" (the protocol parser) into a single, high-rigor environment.
