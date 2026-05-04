<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0027-organization-based-authority-scopes.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the "Claim & Delegate" strategy for organization-based security.
 * Traceability: Issue #86, Task 4.21
 * Status: Active
 * ======================================================================== -->

# ADR 0027: Organization-Based Authority Scopes

## Context
As Pharos Kitchen Design (Project Prism) transitions from a flat role-based access control (RBAC) model to a high-rigor distribution platform, we must address the complex relationships between Manufacturers (OEMs), Manufacturers' Representatives, and Independent Kitchen Designers (IKDs). 

Legacy systems suffer from "All or Nothing" access or fragmented portals. Pharos requires a unified identity layer that supports "Organization-Based" authority, ensuring that specific metadata, maintenance tools, and "Dialects" (WASM) are only delivered to verified stakeholders without compromising the platform's openness for IKD search.

## Decision
We will implement an Organization-centric security model within the AWS Cognito Identity Bridge, utilizing custom claims to scope authority.

1.  **Identity Attribution (Cognito Custom Claims)**:
    - **`custom:organization`**: The canonical identifier for the stakeholder entity (e.g., `FRYMASTER`, `VULCAN`, `S_AND_S_REPS`).
    - **`custom:scope`**: A comma-separated list of authorized namespaces or manufacturers (e.g., `frymaster.*, oem.maintenance`).
    - **`custom:role`**: Remains the primary RBAC gate (IKD, OEM, ADMIN, etc.).

2.  **The "Claim & Delegate" Strategy**:
    - **Claim**: A Manufacturer verifies ownership of a domain (e.g., `@welbilt.com`) to automatically map users to their Organization.
    - **Delegate**: Organizations can grant specific `custom:scope` entitlements to external users (e.g., a Rep Agency) through the Pharos Admin Control Plane.

3.  **Domain-to-Org Mapping Logic**:
    - The Auth Bridge will maintain a mapping table (Cloudflare D1) between email domains and Organizations.
    - Post-authentication, the Bridge triggers a Cognito Lambda to inject the `custom:organization` claim based on this mapping.

4.  **Authority Hierarchy (Scoping)**:
    - **`OWNER`**: Administrative control over the Organization's metadata and delegated scopes.
    - **`STAFF`**: Internal access to pre-release dialects and forensic data.
    - **`PARTNER`**: External access to specific maintenance sidecars (Pulse-delivered).

5.  **Pulse Protocol Integration**:
    - The `pkd core pulse` command will inspect the JWT's `custom:scope` and `custom:organization` claims.
    - Only binaries and WASM dialects matching these scopes will be synchronized to the user's local XDG cache.

## Rationale
- **IP Protection**: Maintenance tools often contain proprietary diagnostic logic. Organization-based scoping ensures these "Sidecars" are never leaked to the general public registry.
- **Administrative Sharding**: Reduces the "Global Admin" burden by allowing manufacturers to manage their own delegates and partner scopes.
- **Zero-Trust Distribution**: Every module delivered by the Pulse protocol is validated against a cryptographic claim in the user's identity token.

## Impact
- **Infrastructure**: Update AWS Cognito schema and Cloudflare D1 mapping table.
- **Auth Bridge**: Implement the Lambda trigger for claim injection.
- **CLI**: Update `pkd-cli` to respect organizational scopes during `pulse` sync and `admin` commands.
- **Security**: Hardened "Shift-Left" logic for module delivery.

## Verification
- Identity Bridge unit tests for domain-to-org mapping.
- Integration test: `auth login` as a verified OEM user and verify `custom:organization` in the resulting JWT.
- Pulse sync test: Verify that unauthorized users cannot fetch "Admin Sidecar" artifacts even if the URL is known.
