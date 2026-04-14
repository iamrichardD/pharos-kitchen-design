/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0023-rfc2378-and-fail-fast-integration.md
 * Status: Active
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying RFC 2378 search metadata and Fail Fast engineering practices.
 * Traceability: .project/rfc2378.md, .project/fail_fast.md
 * ======================================================================== */

# ADR 0023: RFC 2378 Search Metadata & Fail Fast Engineering

## Context
To achieve high-rigor interoperability and reduce long-term maintenance costs, Pharos must adopt standardized search metadata and proactive error detection strategies. 

1. **RFC 2378 (CCSO Nameserver)** provides a battle-tested information model for field-level metadata (e.g., `Indexed`, `Lookup`, `Unique`) that can be applied to our BIM parameter schema to optimize search performance and data integrity.
2. **Fail Fast** (Jim Shore, IEEE Software) is a philosophy that mandates immediate, visible failure when an invariant is violated, making defects easier to locate and fix before they reach production.

## Decision

### 1. Codifying RFC 2378 Search Metadata
We will adopt the field attribute model from RFC 2378 into the `pharos-schema.json`. Every `shared_parameter` will support optional metadata keywords:
- **`Indexed`**: Parameter is part of the primary search index (e.g., `PKD_ModelNumber`).
- **`Lookup`**: Parameter can be used in the selection criteria of a query (e.g., `PKD_Voltage`).
- **`Unique`**: Parameter must be unique across the entire equipment registry.
- **`Public`**: Parameter is viewable without special administrative privileges.

### 2. Codifying Fail Fast Engineering
We will mandate "Fail Fast" practices across all code generation and review cycles:
- **Assertions as Sentinels**: Use `assert!` (Rust) and strict validation (TypeScript) at "system seams" (API boundaries, database persistence, IPC).
- **No Masking**: Ban "robust" workarounds (e.g., returning `null` or empty defaults for critical configuration) that result in "failing slowly."
- **Informative Failures**: Assertion messages MUST include contextual information (e.g., "can't find [X] property in config file [Y]") rather than just repeating the condition.
- **Global Error Handlers**: Every application (`pkd-cli`, `auth-bridge`, `marketing`) MUST implement a robust global exception handler to catch, log, and report these failures gracefully to developers while protecting the user experience.

## Rationale
- **RFC 2378 Integration**: Provides a semantic vocabulary for search optimization that aligns with our **Metadata-First Truth** philosophy. It allows the `pkd-core` validator to enforce searchability constraints at the schema level.
- **Fail Fast Integration**: Directly supports the **Agentic Continuity** mandate by ensuring that bugs introduced by AI agents or human developers are caught immediately at the source, reducing the "Hallucination Gap" and debugging toil.

## Impact
- **Schema Evolution**: `pharos-schema.json` will be updated to include these field attributes.
- **Code Standards**: `GEMINI.md` will be updated to include "Fail Fast" as a core mandate for all implementations.
- **Verification**: Tests must verify that components fail as expected when provided with invalid or missing critical data.
