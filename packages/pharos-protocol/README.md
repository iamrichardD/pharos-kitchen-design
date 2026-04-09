# pharos-protocol-rs

[![License: FSL-1.1](https://img.shields.io/badge/License-FSL--1.1-blue.svg)](https://github.com/iamrichardD/pharos-kitchen-design/blob/main/LICENSE)
[![High Rigor](https://img.shields.io/badge/Engineering-High--Rigor-green.svg)](#)

A high-rigor, modern Rust implementation of the **RFC 2378 (CCSO Nameserver)** architecture.

## 🎯 The "Why"
In the Pharos ecosystem, interoperability is the primary directive. Whether managing human directories (**ph**), industrial infrastructure (**mdb**), or parametric BIM content (**pkd**), a unified "Language of Truth" is required to eliminate the "Hallucination Gap."

This library provides a stateless, high-performance implementation of the CCSO protocol, designed for both native CLI tools and WASM-based web/Revit integrations.

## 🛠 Features & Compliance
This library adheres strictly to the specifications defined in RFC 2378 while providing modern ergonomic extensions.

| Component | Status | Description |
| :--- | :--- | :--- |
| **Lexer** | ✅ 100% | Handles whitespace, double-quotes, and escapes (`\n`, `\t`, `\"`, `\\`). |
| **Parser** | ✅ 90% | Full AST support for standard commands and Pharos extensions (`auth`). |
| **Wildcards** | ✅ 100% | Full support for `*` (zero-or-more), `+` (one-or-more), `?` (exactly one), and `[set]`. |
| **Formatting** | ✅ 100% | Standardized human-readable scaling for AEC/Infrastructure units (KB/MB/GB). |
| **Fail Fast** | ✅ 100% | Informative error messages for syntax and validation failures. |

## 🚀 Usage
```rust
use pharos_protocol::{parse_command, Command};

fn main() {
    let raw = "query manufacturer=hobart return name voltage";
    let cmd = parse_command(raw).expect("Syntax error");

    if let Command::Query { selections, returns } = cmd {
        // High-rigor search logic here
    }
}
```

## 🤖 Agentic Hand-off Instructions
**Target Agent:** Non-PKD Library Maintainer.

This crate is currently part of the Pharos Kitchen Design monorepo but is architected for standalone extraction. Your responsibilities include:

1.  **Extraction:** Move this crate to a standalone GitHub repository (`pharos-protocol-rs`).
2.  **Promotion:** Prepare the crate for publication on `crates.io`.
3.  **Documentation:** Enforce `#[deny(missing_docs)]` and ensure every public symbol is documented with a "Why" (intent).
4.  **Verification:** Implement edge-case fuzzing for the parser and maintain near 100% test coverage using atomic semantic naming.
5.  **Performance:** Optimize for zero-allocation parsing using lifetimes where appropriate.
6.  **WASM:** Maintain strict compatibility with `wasm32-unknown-unknown`.

## ⚖️ License
This project is licensed under the **Functional Source License 1.1 (FSL-1.1)**.

### Interoperability Disclosure
Use of third-party trademarks is strictly for **Nominative Fair Use** to identify compatibility under **17 U.S.C. § 1201(f)**.
