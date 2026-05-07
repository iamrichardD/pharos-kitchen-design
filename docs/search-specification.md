/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Specification
 * File: docs/search-specification.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: High-rigor Technical Specification for the Pharos Search Protocol.
 * Traceability: Issue #99, Task 4.23, ADR-0024, RFC 2378
 * ======================================================================== */

# 🔍 Pharos Search Specification (RFC 2378)

Pharos Kitchen Design (PKD) utilizes a high-performance, attribute-first search protocol based on the **RFC 2378 (CCSO Nameserver)** standard. This specification defines the formal syntax, wildcard behaviors, and validation rules for equipment discovery within the PKD ecosystem.

## 1. Protocol Philosophy

The Pharos Search Protocol is designed to eliminate the "Hallucination Gap" by enforcing deterministic, metadata-driven discovery. It prioritizes:
- **Attribute-First Search**: Equipment is found via physical and electrical properties rather than arbitrary text strings.
- **Fail-Fast Validation**: All queries are validated against the `PharosSchema` before execution.
- **WASM-Optimized Lexing**: The protocol parser is implemented in Rust for cross-platform performance.

## 2. Formal Syntax (BNF)

The following Backus-Naur Form (BNF) defines the structure of a Pharos `query` command:

```bnf
query-command   = ("query" / "ph") 1*selection ["return" 1*attribute]
selection       = value / attribute-value
attribute-value = attribute "=" value
attribute       = 1*( ALPHA / DIGIT / "_" / "-" )
value           = 1*( cstring / quoted-string / set )
cstring         = 1*( ALPHA / DIGIT / WILD / set / quoted-pair )
quoted-string   = <"> 1*( qtext / quoted-pair ) <">
set             = '[' 1*( ALPHA / DIGIT ) ']'
WILD            = "*" / "+" / "?"
```

### Command Variants
- **`query`**: The standard command for searching the registry.
- **`ph`**: Legacy alias for `query`, supported for protocol parity.
- **Positional Fallback**: The `pkd` CLI defaults to `query` if no subcommand is provided (e.g., `pkd manufacturer=3m`).

## 3. Wildcard Behavior

Pharos implements the four standard RFC 2378 wildcards. Each wildcard is mapped to a specific functional behavior with regex-equivalence.

| Wildcard | Name | Description | Regex Equivalent |
| :--- | :--- | :--- | :--- |
| `*` | Asterisk | Matches zero or more characters. | `.*` |
| `+` | Plus | Matches one or more characters. | `.+` |
| `?` | Question | Matches exactly one character. | `.` |
| `[set]` | Set | Matches any single character in the set. | `[set]` |

### Example Matches
- `ho*`: Matches `hobart`, `honeywell`, `ho`.
- `3+m`: Matches `30m`, `300m` (but **not** `3m`).
- `t[ao]nk`: Matches `tank`, `tonk` (but **not** `tenk`).

## 4. Field Validation (Lookup vs. Indexed)

Every field queried must exist within the `PharosSchema`. Fields are governed by two primary attributes:

1.  **Lookup**: The field is allowed to be used in the selection part of a query.
2.  **Indexed**: The field is optimized for high-speed retrieval. A query **must** contain at least one `Indexed` field unless the `ADMIN` role is active.

### Core Searchable Fields
| Field | PKD Parameter | Type | Attributes |
| :--- | :--- | :--- | :--- |
| `manufacturer` | `PKD_Manufacturer` | TEXT | Indexed, Lookup |
| `model` | `PKD_ModelNumber` | TEXT | Indexed, Lookup, Unique |
| `voltage` | `PKD_Voltage` | TEXT | Lookup |
| `phase` | `PKD_Phase` | NUMBER | Lookup |
| `btu` | `PKD_BTU` | NUMBER | Lookup |

## 5. Security & Fail-Fast Guards

- **ReDoS Immunity**: All wildcard resolution is performed with a 100ms temporal sentinel.
- **Role Enforcement**: Fields marked as `Private` or `LocalPub` are invisible to standard `DESIGNER` roles.
- **Strict Parsing**: Invalid characters (e.g., `;`, `:`, `,`) are treated as word delimiters and cannot be used within values unless quoted.
