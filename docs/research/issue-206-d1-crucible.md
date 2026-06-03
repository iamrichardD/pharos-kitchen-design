<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Architecture
 * File: issue-206-d1-crucible.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Three-Option Crucible for Issue #206 (Cognito to D1 Migration).
 * Traceability: Issue #206
 * Last Updated: 2024-05-28
 * ======================================================================== -->

# Three-Option Crucible: Issue #206 (Identity Re-platforming to D1)

## 1. The Mob Session

**PMA**: We're cutting AWS Cognito. It's bloated and violates our "Free Forever" remote state mandate. We're moving identity to Cloudflare D1. We need three options to get this done. Kent, how do we start?

**Kent Beck**: Write a failing test for the new D1 data source. Just swap the data access layer. Keep the existing JWT logic and interfaces exactly as they are. Don't overthink the architecture yet. Get it green, then refactor if it hurts.

**Uncle Bob**: I disagree with leaving the architecture alone. The Auth Bridge is a critical boundary. Cognito leaked into our core use cases. We need to isolate D1 behind a strict interface in the `auth-bridge` package. The core entities shouldn't know if they're running on Cloudflare or a local SQLite file.

**Martin Fowler**: If we're rebuilding the bridge, let's look at the evolutionary path. Why are we moving passwords to D1? We should strangle the Cognito password flow and implement Passkeys (WebAuthn). It's the modern standard. We build the Passkey slice alongside the legacy one, migrate the users, and kill the password database entirely.

**Senior BIM Developer**: The Passkey approach means we don't have to manage secure password hashing in the WASM edge worker. That's a huge performance and security win for the `pkd-core` integration. 

**SPIA**: From a UX perspective, independent designers hate managing another password. Passkeys reduce friction. It fits the "Remarkable" mandate.

**SPM**: Let's formalize these three paths. 

## 2. The Three Options

### Option A: The Data-Layer Swap (Simple Path)
- **Concept**: A 1:1 migration. We replace Cognito's SDK with direct Cloudflare D1 SQL queries.
- **Mechanics**: Keep email/password auth. We handle bcrypt hashing inside the Cloudflare Worker. Existing JWT structures remain identical.
- **Pros**: Fastest time to market. Minimal disruption to the frontend slice.
- **Cons**: Carries over all legacy Cognito design baggage. Hashing passwords on edge workers eats compute time.

### Option B: Clean Auth Boundary (Architectural Path)
- **Concept**: Rewrite `auth-bridge` using strict Clean Architecture.
- **Mechanics**: D1 becomes an implementation detail behind an `IUserRepository` interface. We still use passwords, but the core business rules are completely isolated. 
- **Pros**: Highly testable. Podman validation is trivial because we can swap D1 for local SQLite.
- **Cons**: High effort. We're over-engineering a password system that we ultimately want to deprecate.

### Option C: Passkey-First Sovereign Identity (Future-Ready Path)
- **Concept**: Drop passwords entirely. Implement WebAuthn using D1 to store public keys.
- **Mechanics**: Build a new vertical slice for Passkey registration/auth. Use the Strangler Fig pattern to route new sign-ups to Passkeys, while maintaining a temporary bridge for legacy Cognito users.
- **Pros**: Eliminates password liability. Aligns perfectly with the Sovereign Identity mandate. Edge-compute friendly (cryptographic signature verification is lighter than bcrypt hashing).
- **Cons**: Highest initial complexity. Requires frontend UX changes to handle the WebAuthn API.

## 3. Brutally Honest Evaluation

- **Option A** is a trap. We're just changing the logo on our technical debt. We don't want to manage passwords, and porting that burden to D1 doesn't solve the underlying UX or security issues.
- **Option B** is architecturally pure but practically pointless. Writing a pristine Clean Architecture wrapper around a legacy password flow is a waste of engineering bandwidth. It improves the DX but ignores the UX.
- **Option C** is the only path that actually advances the product. It hurts upfront because WebAuthn is complex, but it completely removes the liability of password management from our Cloudflare workers. It directly supports the "Free Forever" model by slashing compute and storage requirements.

## 4. The Verdict

**Promoted: Option C (Passkey-First Sovereign Identity)**

We will use Martin's Strangler Fig approach. We'll build the new WebAuthn slice backed by D1 first. Once verified in Podman (using a local SQLite D1 shim), we'll shift the frontend to prefer Passkeys. 

**Next Steps**:
1. Define the D1 Schema for WebAuthn Credentials.
2. Write the failing atomic tests for the WebAuthn challenge/verify lifecycle in `auth-bridge`.
3. Execute implementation in a Sibling worktree (ADR-0035).