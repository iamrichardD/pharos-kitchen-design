<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0059-organizational-entity-and-subscription-mapping.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Defining the hierarchy between Identity, Organization, and Licensing.
 * Traceability: Issue #204, ADR-0027, ADR-0056
 * Status: Proposed
 * ======================================================================== -->

# ADR 0059: Organizational Entity & Subscription Mapping

## Context
As Pharos transitions to a "Cash-Strapped Bootstrap" commercial model, we must define how users are grouped for licensing, billing, and delegated authority. We need a model that supports both the **Solo IKD** and the **Global Manufacturer** while maintaining our "Free Forever" infrastructure goal for base operations.

## Decision
We are implementing a **Multi-Tenant Sovereign Hierarchy** in D1:

1.  **The Party Model Entity Separation**:
    - **Identity**: The human actor (Email + Passkey Thumbprint).
    - **Organization**: The legal/professional entity (The "Fortress").
    - **Subscription**: The commercial contract (The "Contribution").

2.  **The "Private Sanctuary" Default**:
    - Every new Identity is automatically provisioned a **Private Sanctuary Organization** (Org-of-One).
    - This organization is the default owner of the user's **Private Forks (ADR-0056)**.

3.  **Organization Types & Tiers**:
    - **IKD (Designer)**:
        - **Apprentice (Trial)**: 30-day full access.
        - **Sovereign (Monthly/Yearly)**: Professional access to fulfillment and shards.
    - **OEM (Manufacturer)**:
        - Requires **DNS Verification (ADR-0052)**.
        - Authorized to publish `OEM_CERTIFIED` shards.
    - **PARTNER (Rep Agency)**:
        - Grouped entity that holds **Delegated Scopes** from one or more OEMs.

4.  **Subscription-to-Org Binding**:
    - Subscriptions are bound to the **Organization**, not the Identity.
    - An Organization can have one or many Members (Identities). This allows an OEM to pay one bill for their entire global staff.

5.  **The Legacy Shield (Loyalty Pricing)**:
    - Contiguous subscriptions will be protected by a **Price Shield**.
    - If the platform pricing increases, existing "Sovereign" members retain their original rate as long as the subscription remains active.

## Rationale
- **Scalability**: Decoupling Identity from Organization allows a user to work for Hobart during the day and use their "Private Sanctuary" for independent consulting at night.
- **Commercial Viability**: The "Manufacturer Tax" subsidizes the base infrastructure, while IKD subscriptions fund the "Command-First" feature development.
- **Bootstrap Efficiency**: Managing billing at the Org level reduces administrative toil and Stripe transaction overhead.

## Impact
- **Database**: Implementation of the `Organizations`, `Memberships`, and `Subscriptions` tables in D1.
- **Sentinel**: The `PolicyGuard` in `pkd-core` will check the `organization_tier` during fulfillment.
- **UI**: Organization management and seat allocation views in the Admin Control Plane.

## Verification
- **Schema Audit**: Confirm that a single Identity can belong to multiple Organizations.
- **Billing Test**: Verify that a subscription update on an Organization correctly gates/un-gates all member Identities.
- **Price Shield Test**: Verify that a price increase in the "Global" config does not affect existing "Active" subscription records.
