<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0062-team-subscription-breakpoints-and-collaborative-incentives.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the tiered bucket pricing model and the incentives for firm consolidation.
 * Traceability: ADR-0059, ADR-0061
 * Status: Proposed
 * ======================================================================== -->

# ADR 0062: Team Subscription Breakpoints & Collaborative Incentives

## Context
To maximize the network effect of the Pharos "Truth Engine" and reduce administrative billing toil, we must define clear subscription breakpoints for multi-user design firms. Our goal is to incentivize teams to operate as a **Single Organization (ADR-0061)**. As a one-person-founder startup, our pricing model must prioritize self-service automation and "Agentic Priority" over high-touch human support.

## Decision
We are adopting a **Tiered "Studio Bucket" Pricing Model**:

1.  **The Solo Tier (IKD)**:
    - **Price**: $399/year.
    - **Capacity**: 1 Identity.
    - **Self-Service**: Standard community-driven documentation.

2.  **The Studio Tier (Breakpoint 1)**:
    - **Price**: $1,499/year (Flat rate).
    - **Capacity**: Up to 5 Identities.
    - **Incentive**: Centralized billing and a shared "Firm Sanctuary."

3.  **The Agency Tier (Breakpoint 2)**:
    - **Price**: $4,999/year (Flat rate).
    - **Capacity**: Up to 20 Identities.
    - **Advanced Capabilities**: Multi-domain verification, bulk delegation, and **Priority Agentic Response**. 
    - **Definition of Support**: Issues raised by Agency-tier organizations receive prioritized analysis by the Pharos Mastermind Mob (AI Agents) and automated infrastructure recovery.

4.  **Consolidation Enforcement**:
    - "Shared Sanctuary" features require a Single Organization ID. Cross-org sharing of private forks is not supported at the Solo tier.

5.  **Legacy Protection (Loyalty)**:
    - The **"Price Shield" (ADR-0059)** applies to the entire bucket for contiguous subscriptions.

## Rationale
- **Market Displacement**: Priced 40% lower than KCL ($499/yr) while offering superior collaborative features.
- **Bootstrap Efficiency**: Bucket pricing reduces Stripe transaction count and administrative "Seat Churn" management.
- **Agentic Priority**: Replacing human "Dedicated Support" with prioritized agentic analysis respects the founder's time while providing high-value forensic utility to large firms.

## Impact
- **UI**: Display "Agentic Priority" as the primary support differentiator in the Agency tier.
- **Sentinel**: The `PolicyGuard` in `pkd-core` must verify the Org's `seat_limit`.

## Verification
- **Commercial Audit**: Verify that the "Studio" rate provides sustainable revenue for the $0/month infrastructure goal.
- **System Test**: Verify that the 6th user cannot be added to a "Studio" Org without an upgrade.
