# ADR 0014: Public Container Registry Prioritization

## Status
Proposed

## Context
The Pharos Kitchen Design (Project Prism) relies heavily on a "Zero-Host Execution" strategy using Podman containers for build, test, and validation. Relying on the default Docker Hub (`docker.io`) registry introduces risks including:
1.  **Anonymous Pull Rate-Limiting:** Interruption of CI/CD pipelines and developer workflows.
2.  **Supply Chain Predictability:** Inconsistent availability of upstream images.
3.  **Enterprise Alignment:** Aligning with high-rigor environments that prefer authenticated or enterprise-grade public registries (AWS ECR Public, Google Artifact Registry).

## Decision
We will codify the prioritization of public enterprise container registries over Docker Hub.

1.  **Mandatory Prefixing:** All `FROM` instructions in `Containerfile`s must use fully qualified image names.
2.  **Preferred Registries:**
    - `public.ecr.aws/` (Amazon ECR Public)
    - `gcr.io/` or `*.pkg.dev` (Google Artifact Registry)
3.  **Prohibited Defaults:** The use of unqualified names (e.g., `FROM rust:latest`) or explicit `docker.io` references is prohibited unless the image is exclusively available there and has been vetted.
4.  **Verification:** Automated audits will flag non-compliant `FROM` statements as "Low-Rigor" violations.

## Consequences
- **Positive:** Improved CI/CD reliability and bypass of Docker Hub rate limits.
- **Negative:** Slightly more verbose `Containerfile`s.
- **Neutral:** Requirement for developers to verify the availability of their base images on preferred registries.
