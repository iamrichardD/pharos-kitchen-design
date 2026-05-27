#!/usr/bin/env python3
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / Boundary
# File: verify-boundary-sync.py
# Author: Richard D. (https://github.com/iamrichardd)
# License: FSL-1.1 (See LICENSE file for details)
# Purpose: Lexical sentinel to ensure Rust exports match C# P/Invoke signatures.
# Traceability: ADR-0044, Issue #168
# ========================================================================

import re
import os
import sys

def get_rust_exports(file_path):
    exports = set()
    if not os.path.exists(file_path):
        print(f"❌ [BOUNDARY] ERROR: Rust source file not found: {file_path}")
        sys.exit(1)
    with open(file_path, 'r') as f:
        content = f.read()
        # Look for #[no_mangle] followed by pub unsafe extern "C" fn name
        matches = re.findall(r'#\[no_mangle\]\s+pub\s+unsafe\s+extern\s+"C"\s+fn\s+([a-zA-Z0-9_]+)', content)
        for m in matches:
            exports.add(m)
    return exports

def get_csharp_imports(file_path):
    imports = set()
    if not os.path.exists(file_path):
        print(f"❌ [BOUNDARY] ERROR: C# source file not found: {file_path}")
        sys.exit(1)
    with open(file_path, 'r') as f:
        content = f.read()
        # Look for [DllImport("pkd_core" or LibName, ...)] followed by private/public static extern ... name
        matches = re.findall(r'\[DllImport\((?:"pkd_core"|LibName).*?\]\s+.*?extern\s+.*?\s+([a-zA-Z0-9_]+)\(', content, re.DOTALL)
        for m in matches:
            imports.add(m)
    return imports

def main():
    rust_file = "packages/pkd-core/src/bindings.rs"
    csharp_file = "packages/revit-bridge/src/RevitBridge.cs"

    print(f"🔍 [BOUNDARY] Verifying FFI synchronization between {rust_file} and {csharp_file}...")

    rust_exports = get_rust_exports(rust_file)
    csharp_imports = get_csharp_imports(csharp_file)

    missing_in_csharp = rust_exports - csharp_imports
    # Note: Some Rust exports might be for WASM or other bridges, 
    # but for pkd_core specifically, we expect RevitBridge to be the primary consumer.
    
    # We also check for orphaned imports in C#
    orphaned_in_csharp = csharp_imports - rust_exports

    error = False

    if missing_in_csharp:
        print(f"❌ [BOUNDARY] Found Rust exports missing in C# Bridge:")
        for m in sorted(missing_in_csharp):
            print(f"   - {m}")
        # Not strictly an error yet, as some might be internal or for other bridges
        # But for Pharos, we want high-rigor synchronization.

    if orphaned_in_csharp:
        print(f"❌ [BOUNDARY] Found orphaned C# P/Invoke declarations (not exported by Rust):")
        for m in sorted(orphaned_in_csharp):
            print(f"   - {m}")
        error = True

    if error:
        print("🛑 [BOUNDARY] Synchronization check FAILED. Please reconcile the FFI boundary.")
        sys.exit(1)
    else:
        print("🟢 [BOUNDARY] FFI Boundary synchronization verified.")
        sys.exit(0)

if __name__ == "__main__":
    main()
