<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0049-sovereign-identity-migration.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify the move to D1-based identity and the removal of Cognito.
 * Traceability: Issue #206, ADR-0038
 * Last Updated: 2026-06-02
 * Status: Approved
 * ======================================================================== -->
# ADR-0049: Sovereign Identity Migration (D1-First)

## Context
Right now, our identity stack is split between AWS Cognito (for user records and JWTs) and Cloudflare D1 (for session handshake data). This "hybrid" approach is adding a lot of unnecessary weight. We're dealing with cross-cloud latency, complex IAM policies, and the constant threat of a Cognito bill once we scale. Since we don't have any real production users yet, it’s the perfect time to simplify.

## Decision
I'm moving the entire identity repository into Cloudflare D1. We're ripping out AWS Cognito and replacing it with a sovereign, Edge-based system.

1.  **D1-Backed Users**: All user records, roles, and organization claims will live in a high-rigor SQL schema in D1.
2.  **Edge JWT Signing**: The `auth-bridge` worker will now be responsible for signing our JWTs using the native Web Crypto API.
3.  **JWKS Sovereignty**: We’ll host our own JSON Web Key Set (JWKS) endpoint directly on the worker so the CLI and core engine can verify tokens without ever leaving our network.
4.  **Zero-SDK Footprint**: We're removing the AWS Identity SDKs from the monorepo.

## Rationale
- **Simplicity**: One database, one runtime, zero external cloud dependencies for auth.
- **Velocity**: I can now test the entire auth flow 100% offline in Podman. No more fighting with AWS credentials during local dev.
- **Cost**: This locks in our $0/mo floor for identity. We pay for the Worker CPU we're already using, and that's it.
- **Freedom**: If we ever need to move, it's just a SQL export. We aren't locked into a proprietary AWS service.

## Consequences
- **Security Responsibility**: We're now the logical authority for JWT signing. This means our implementation rigor must be absolute.
- **Infrastructure Cleanup**: We get to delete a large chunk of Terraform code (`identity.tf`).
- **Passkey Ready**: This move makes implementing Passkeys (#205) a simple SQL update rather than an AWS custom-flow nightmare.
