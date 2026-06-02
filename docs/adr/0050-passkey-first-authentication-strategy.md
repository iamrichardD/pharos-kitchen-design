<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0050-passkey-first-authentication-strategy.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Mandate Passkeys as the primary identity standard.
 * Traceability: Issue #205, ADR-0049
 * Last Updated: 2026-06-02
 * Status: Approved
 * ======================================================================== -->
# ADR-0050: Passkey-First Authentication Strategy

## Context
Passwords are a relic. They’re a security liability for us and a cognitive burden for our designers. In a project built on "Metadata-First Truth," our identity layer should be just as rigorous as our BIM data. WebAuthn (Passkeys) gives us a way to move from "something you know" to "something you have" (biometrics or hardware keys).

## Decision
I'm establishing a **Passkey-First** standard for all Pharos identities. 

1.  **Primary Auth**: New users will be encouraged to register a Passkey immediately. 
2.  **Hardware Binding**: Manufacturers (OEMs) with high-level authority over their registry shards will be required to use Passkeys for all sensitive write operations.
3.  **Edge Validation**: The `auth-bridge` (now sovereign via ADR-0049) will handle the WebAuthn handshake using the `SimpleWebAuthn` library.
4.  **Recovery**: We will implement a high-rigor, domain-verified recovery path for users who lose access to their primary authenticator.

## Rationale
- **Security**: Passkeys are immune to phishing and credential stuffing. This protects the integrity of our equipment registry.
- **UX**: One-touch login for designers on Revit workstations is a massive improvement over typing complex passwords.
- **Architecture**: By building this into our D1-backed bridge, we maintain total control over the security handshake without paying third-party fees.

## Consequences
- **Device Support**: We have to ensure our CLI (RFC 8628) and Web Sandbox correctly trigger the native platform prompts (Windows Hello, macOS TouchID).
- **Migration Path**: We'll maintain a legacy password path for a transition period, but it will be explicitly marked as "Lower Rigor."
