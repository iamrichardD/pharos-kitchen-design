<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0027-organization-based-authority-scopes.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the "Claim & Delegate" strategy for organization-based security.
 * Traceability: Issue #86, Task 4.21 (SPM Verified)
 * Status: Superseded by ADR-0056
 * ======================================================================== -->

# ADR 0027: Organization-Based Authority Scopes (SUPERSEDED)

## Context
**NOTE: This ADR is SUPERSEDED by ADR-0056.** The logic for organization scoping has transitioned from Cognito custom claims to Sovereign Authority Handshakes.

As Pharos Kitchen Design (Project Prism) transitions from a flat role-based access control (RBAC) model to a high-rigor distribution platform, we must address the complex relationships between Manufacturers (OEMs), Representatives, and Independent Kitchen Designers (IKDs). 

Legacy systems usually give you "everything or nothing." This doesn't work for us. Pharos needs a unified identity layer that understands "Organization-Based" authority. We need to know who owns what, who can update a Hobart dishwasher's metadata, and how we deliver proprietary diagnostic tools (Dialects) without leaking them to the whole world.

## Decision
We're implementing an Organization-centric security model within the AWS Cognito Identity Bridge. We'll use custom JWT claims to scope authority and define "Logical Authority" over registry shards.

1.  **Identity Attribution (Cognito Custom Claims)**:
    - **`custom:organization`**: The unique ID for the entity (e.g., `HOBART`, `VULCAN`, `S_AND_S_REPS`).
    - **`custom:scope`**: A list of authorized namespaces or manufacturers (e.g., `hobart.*, oem.maintenance`).
    - **`custom:role`**: The primary gate (IKD, OEM, ADMIN).

2.  **The "Logical Authority" for Registry Shards**:
    - Every equipment shard in the Pharos Registry (e.g., `registry/hobart/lxih.json`) is bound to an organization.
    - **Write Access**: To push an update to a Hobart shard, the user's `custom:organization` MUST match `HOBART`, or their `custom:scope` must explicitly allow `hobart.write`.
    - **IKD Sanctuary**: IKDs have read-access to all public shards but cannot modify manufacturer-certified data. They can, however, "fork" data into their own organizational namespace for private project variations.

3.  **The "Claim & Delegate" Strategy**:
    - **Claim**: A Manufacturer verifies their domain (e.g., `@itwfoodequipment.com`) to automatically map users to their Organization.
    - **Delegate**: Manufacturers can grant specific `custom:scope` entitlements to external partners (like a Rep Agency) through the Pharos Admin Control Plane. This allows a Rep to update data on behalf of the manufacturer without needing a corporate email address.

4.  **Domain-to-Org Mapping Logic**:
    - The Auth Bridge manages a mapping table in Cloudflare D1.
    - When you log in, a Cognito Lambda trigger checks your email domain and injects the `custom:organization` claim.

5.  **Authority Hierarchy (Scoping)**:
    - **`OWNER`**: Total control over the Org's metadata, delegated scopes, and registry shards.
    - **`STAFF`**: Internal access to pre-release dialects and forensic data.
    - **`PARTNER`**: External access to specific maintenance sidecars or limited write scopes.

6.  **Pulse Protocol Integration**:
    - The `pkd core pulse` command checks your JWT. It only downloads binaries and WASM dialects that match your `custom:scope` or `custom:organization`. This keeps the "Maintenance Dialects" secure and focused.

## Rationale
- **IP Protection**: Maintenance tools are sensitive. We shouldn't leak them. Scoping ensures they stay where they belong.
- **Data Integrity**: We can't have random users updating Hobart's official specs. "Logical Authority" creates a clear chain of custody.
- **Administrative Sharding**: Hobart should manage Hobart's people. We shouldn't have to play "Global Admin" for every manufacturer.
- **Zero-Trust Distribution**: Everything delivered via `pulse` is verified against your identity. No claim, no download.

## Impact
- **Infrastructure**: Update AWS Cognito schema and Cloudflare D1 mapping table.
- **Auth Bridge**: Implement the Lambda trigger for claim injection.
- **CLI**: Update `pkd-cli` to respect organizational scopes during `pulse` sync and `admin` commands.
- **Security**: Hardened "Shift-Left" logic for module delivery.

## Verification
- **Unit Tests**: Verify the domain-to-org mapping logic in the Auth Bridge.
- **Integration Test**: Log in as a verified OEM user and confirm the `custom:organization` and `custom:scope` claims are present.
- **Registry Gate Test**: Attempt to push a Hobart update with a Vulcan token and verify it fails fast.
- **Pulse Sync Test**: Ensure unauthorized users can't fetch "Admin Sidecar" artifacts.
