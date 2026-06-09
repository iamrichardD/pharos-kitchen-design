<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0064-manufacturer-subscription-and-value-framework.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the lean, bootstrap-realistic value proposition for OEMs.
 * Traceability: ADR-0015, ADR-0056, ADR-0062, ADR-0063
 * Status: Proposed
 * ======================================================================== -->

# ADR 0064: Manufacturer Subscription & Value Framework

## Context
Pharos Kitchen Design (Project Prism) must offer a high-value subscription model for Manufacturers (OEMs) that respects the "One-Person Founder" reality. We must avoid high-touch service offerings (white-labeling, dedicated human support) and "Pay-to-Play" search mechanics (sponsored indexing) in favor of automated, merit-based integrity. 

## Decision
We are adopting a **Two-Tier Manufacturer Subscription Model** focused on "Toil Reduction" and "Data Sovereignty":

1.  **Tier 1: The Apprentice OEM ($1,999/yr)**:
    - **Focus**: Toil Reduction & Automated Discovery.
    - **Value**: Automates the sync between the OEM's portal and the Pharos Registry (ADR-0015), eliminating manual data entry.
    - **Badge**: `[PROVISIONALLY VERIFIED]`.
    - **Insights**: Monthly "Metadata Maturity" reports (Identifying broken URLs or missing parameters).

2.  **Tier 2: The Authoritative OEM ($9,999/yr)**:
    - **Focus**: Data Sovereignty & Network Empowerment.
    - **Value**: Unlocks the full cryptographic power of the Pharos Sentinel for the OEM and their Rep network.
    - **Badge**: **`OEM_CERTIFIED`** (Requires DNS verification).
    - **Key Features**:
        - **Multi-Principal Delegation**: Ability to grant biometric authority to Rep Agencies who can represent multiple vendors simultaneously.
        - **Private Utility Hosting**: Secure distribution for up to 10 proprietary WASM dialects (Maintenance/Diagnostics).
        - **Fidelity-Based Ranking**: Certified data naturally surfaces first in "Spotlight" search due to superior metadata maturity scores.

### Multi-Principal Delegation (The Rep Wallet)
We explicitly support the "Dealer Reality":
- A Rep Agency (Partner) is an identity that can hold delegated scopes from **multiple Principal Manufacturers**.
- The `PolicyGuard` (ADR-0056) verifies the "Active Context" of the Rep's request against the specific Principal's delegation record in D1.

## Rationale
- **Founder Efficiency**: By focusing on **Self-Service Automation** (Truth Proxy, Biometric Handshakes), we eliminate the need for a dedicated support or sales team.
- **Search Meritocracy**: Ranking by "Fidelity" rather than "Sponsorship" ensures that the Designer always finds the most accurate data first, protecting the project's "Source of Truth" brand.
- **Scalability**: The "Multi-Principal" model aligns with existing AEC distribution patterns, making it easier for Rep Agencies to adopt Pharos across their entire portfolio.

## Impact
- **D1 Schema**: Implementation of the `DelegationWallet` to support many-to-many relationships between Reps and OEMs.
- **UI**: Implementation of "Maturity Scoring" visualization in Search and Admin dashboards.
- **Billing**: Consolidated billing for OEM Principals; free-tier fulfillment for verified Reps.

## Verification
- **Commercial Audit**: Verify that the $9,999 rate covers the automated ETL compute costs for large-scale manufacturers.
- **Role Test**: Verify that a Rep can switch contexts between two different OEMs without a new login session.
