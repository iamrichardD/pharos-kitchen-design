# ADR-0029: Immutable WASM Promotion

*   **Status**: Accepted
*   **Date**: 2026-05-12
*   **Deciders**: PMA, Senior Engineer, Senior DevSecOps Engineer
*   **Traceability**: Issue #68, ADR-0014, ADR-0017

## Context
Pharos utilizes a multi-stage container build process (ADR-0017) to ensure environmental parity between Rust/WASM compilation and TypeScript/Node.js validation. During the investigation of **Issue #68**, a gap was identified in the "Promotion" phase: WASM artifacts are copied between stages based on file paths without cryptographic verification. This allows for potential "Artifact Drift" where stale or corrupted binaries are consumed by the TS Auditor or the Astro Demo, leading to false positives/negatives in CI and performance regressions.

## Decision
We will implement an **Immutable Artifact Promotion Stage** for all WASM-compiled binaries. 

1.  **Manifest Generation**: The `scripts/build-wasm.sh` script MUST generate a `manifest.json` in the `dist/dialects/` directory.
2.  **Schema**: The manifest will contain an object mapping the dialect filename to its SHA-256 hash:
    ```json
    {
      "pkd_dialect_frymaster.wasm": "sha256:...",
      "pkd_dialect_true.wasm": "sha256:..."
    }
    ```
3.  **Mandatory Verification**: Downstream consumers (Astro, `ts-auditor`) MUST load this manifest and verify the hashes before loading the WASM module into the runtime.
4.  **CLI Gate**: The `pkd-cli` will provide a `core verify-manifest` command to facilitate this check in shell-based environments (ADR-0014).

## Rationale
- **Supply Chain Integrity**: SHA-256 verification ensures that the exact binary produced by the Rust compiler is what is executed in the validation stage.
- **Fail Fast**: Corrupted or mismatched artifacts will cause an immediate failure at the "system seam" (the loader) rather than intermittent runtime errors.
- **Efficiency**: Downstream consumers no longer need to maintain hardcoded hashes; they become dynamic and authoritative based on the build output.

## Consequences
- **Build Time**: Minor increase (~5-10s) in the WASM build phase to calculate hashes.
- **Complexity**: The `WasmDialectLoader` in the Truth Engine must be refactored to be manifest-aware.
- **Stability**: Elimination of "Environmental Gaps" related to WASM promotion in the Pulse CI.
