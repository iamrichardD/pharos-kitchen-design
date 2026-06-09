<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Strategy
 * File: docs/adr/0058-progressive-identity-and-profile-maturation.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codifying the "Zero-Friction" onboarding and progressive identity maturation.
 * Traceability: Issue #204, ADR-0048, ADR-0050, ADR-0056, ADR-0057
 * Status: Proposed
 * ======================================================================== -->

# ADR 0058: Progressive Identity & Profile Maturation

## Context
Pharos Kitchen Design (Project Prism) adheres to a **Command-First UX (ADR-0006)**. To maximize user adoption, we must eliminate the "Registration Tax" that plagues legacy AEC software. However, personalized engagement and manufacturer delegation require richer metadata (Name, Company, Role) than a simple Passkey-bound email can provide.

## Decision
We are implementing a **Progressive Identity Maturation** model:

1.  **The Zero-Friction Seed (Identity Creation)**:
    - The initial **Action Gate (ADR-0057)** only requires the user's **Professional Email**.
    - Identity is established via **Passkey (ADR-0050)** without a "Confirm Your Email" gate.
    - At this stage, the user is a "Sovereign Guest" with full fulfillment rights.

2.  **The Asynchronous Handshake (Transactional Welcome)**:
    - An automated, non-blocking "Welcome" email is triggered upon Passkey creation.
    - **Content Strategy**:
        - *"Get to know us"*: Links to the Search Spec and FAQ.
        - *"Let us get to know you"*: Link to the optional Profile Maturation form.

3.  **The Maturity Tiers**:
    - **Tier 1 (Anonymous)**: Public Search only.
    - **Tier 2 (Sovereign Guest)**: Identity bound (Email + Passkey). Can Fork, Download, and Sync.
    - **Tier 3 (Pharos Citizen)**: Profile matured (Name, Title, Organization). Required for **Publishing** to the public registry or participating in the **Roadmap Vote**.
    - **Tier 4 (Verified Partner/OEM)**: DNS-verified authority (ADR-0052). Required for **Delegation Handshakes** and **OEM Shard Certification**.

4.  **Just-In-Time (JIT) Data Capture**:
    - Users are only prompted for additional metadata when they attempt a "Tier 3" or "Tier 4" action.
    - The UI MUST frame these prompts as **"Unlocking Capabilities"** rather than "Completing Forms."

## Rationale
- **User Empowerment (Kathy Sierra)**: Keeps the designer in the "Flow State" during their first interaction with the Truth Engine.
- **Tribe Building (Seth Godin)**: Uses the welcome email to invite the user into the tribe without a "Sign-up Barrier."
- **Data Integrity**: Ensures that only verified entities (Tier 4) can publish authoritative manufacturer data.

## Impact
- **UI**: Implementation of "Maturation Nudges" in the Designer Portal.
- **D1 Schema**: The `User` table must support optional profile fields that can be populated over time.
- **Email Service**: Configuration of the asynchronous welcome trigger.

## Verification
- **UX Audit**: Verify that a user can go from Search to Download in under 60 seconds.
- **Schema Validation**: Confirm that a `User` record can exist with only an `email` and `credential_id`.
- **Gate Test**: Verify that the "Request Delegation" button triggers the Profile Maturation modal.
