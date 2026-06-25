<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Architecture & Pipelines
 * File: docs/design-analysis.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Evaluate options for resolving the OCI runtime path error during the search index baking stage.
 * Traceability: https://github.com/iamrichardd/pharos-kitchen-design/issues/297
 * Last Updated: 2026-06-25
 * ======================================================================== -->

# Design Analysis: Resolving the OCI Runtime Path/Volume Conflict

During the "Baking authoritative search index" step, the OCI runtime fails to locate the necessary binaries. This document evaluates three competing design options to resolve this bottleneck under our Zero-Host Execution mandate.

---

## The Core Problem
Our build pipeline mounts the host workspace directory (`pwd`) directly over `/work` inside the Podman container to perform the build and execution steps. While this volume mount simplifies access to source files, it completely overrides the pre-compiled binaries and configuration files placed in `/work` during the container's image building stage. When the container attempts to run the search index generator, it fails because the binary has been masked by the empty or host-state volume mount.

---

## Option 1: Global Stage Binary Copy (`/usr/local/bin/pkd`)

We copy the compiled CLI binary to `/usr/local/bin/pkd` during the `rust-builder` image build stage and reference it globally in the workflow instead of expecting it to run from the workspace.

### Crucible Critique
```
                       ┌──────────────────────────┐
                       │   Option 1: Global Copy  │
                       └─────────────┬────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
       [PRO] Clean path resolution     [CON] Image bloat & drift
       [PRO] Out of volume mount path  [CON] Code changes require image build
```

* **Pros**: 
  - Placed outside the `/work` mount, preventing the binary from being overwritten or masked by the host volume.
  - Simplifies script invocations since the binary is available globally on the system `$PATH`.
  - Avoids the massive path-translation cognitive load and script churn introduced by Option 2.
* **Cons**:
  - Requires building the container image to test CLI code changes (though this is already the standard pipeline pattern during pulse verification, mitigating local dev friction).

---

## Option 2: Distinct Host Workspace Mount (`/host`)

Instead of mounting the host workspace directly over `/work`, we mount it to a distinct directory inside the container (e.g., `/host`). The container's `/work` directory remains untouched.

### Crucible Critique
```
                     ┌────────────────────────────────┐
                     │ Option 2: Distinct Mount /host │
                     └───────────────┬────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
       [PRO] Standard container setup  [CON] Double-path translation
       [PRO] Preserves container /work [CON] Breaks simple local scripts
```

* **Pros**:
  - Container environment configuration, assets, and binaries in `/work` remain intact and unmasked.
  - Clean separation between container-provided tooling and host-provided source code.
* **Cons**:
  - **Massive Path-Translation Cognitive Load**: Any workspace-relative paths passed to the CLI must be manually mapped from the host context to the `/host` container context.
  - **Severe Script Churn**: Forces the rewrite of all existing local scripts and workflows that assume the workspace root is mapped to the container's current working directory.

---

## Option 3: Host Runner Extraction (`podman cp`)

We run the compilation inside the container, extract the compiled binary back to the host runner using `podman cp`, and execute the baking step using this host-localized binary.

### Crucible Critique
```
                     ┌────────────────────────────────┐
                     │ Option 3: Runner Extraction    │
                     └───────────────┬────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
       [PRO] Keeps builder container   [CON] Violates Zero-Host mandate
             strictly for compilation  [CON] Host dependency vulnerabilities
```

* **Pros**:
  - The compiler container remains stateless and lightweight.
  - Standardizes compilation output management.
* **Cons**:
  - **Zero-Host Violation**: Running the extracted binary directly on the host runner completely bypasses our execution sandbox.
  - **Dynamic Linker Failures**: The host runner might lack the specific libraries (`glibc`, `openssl`, etc.) required by the compiled binary, causing sporadic runner crashes.
  - **Environment Disparity**: Undermines the guarantee that builds behave identically locally and in CI/CD.

---

## The Verdict & Winner Selection

| Evaluation Criteria | Option 1: Global Copy | Option 2: Distinct Mount | Option 3: Host Extraction |
| :--- | :--- | :--- | :--- |
| **Zero-Host Parity** | 🟢 High | 🟢 High | 🔴 Low (Host Execution) |
| **Dev Inner-Loop Speed** | 🟡 Medium (Aligned with Pulse) | 🟡 Medium | 🟢 High |
| **Path Integrity** | 🟢 High | 🔴 Low (Path Translation) | 🟢 High |
| **Maintainability** | 🟢 High | 🔴 Low (Script Churn) | 🟡 Medium |

### The Winner: **Option 1 (Global Stage Binary Copy)**
While Option 1 requires building the container image to test CLI code changes, this is already the standard pipeline pattern during pulse verification. Selecting Option 1 completely avoids the massive path-translation cognitive load and script churn introduced by Option 2, providing a much cleaner path resolution and keeping developer friction to a minimum.

To guarantee that the search index generator has a deterministic and correct dataset source, the command must explicitly supply the `--source` parameter (pointing to `/work/packages/pkd-core/samples`). This parameter ensures that the index baker operates on the correct volume path inside the container environment.

