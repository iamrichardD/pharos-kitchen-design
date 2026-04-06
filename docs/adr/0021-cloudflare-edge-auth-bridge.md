/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Infrastructure
 * File: 0021-cloudflare-edge-auth-bridge.md
 * Status: Proposed
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Pivoting the Auth Bridge to Cloudflare Workers and D1 for performance.
 * Traceability: ADR 0018, ADR 0019, ADR 0020
 * ======================================================================== */

# ADR 0021: Cloudflare Edge Auth Bridge

## Context
ADR 0019 proposed an AWS Lambda + DynamoDB bridge. While cost-effective, it introduces region-specific latency during the RFC 8628 polling phase. To provide a superior "Command-First" UX, we require edge-native execution and predictable billing.

## Decision

### 1. Edge-Native Logic: **Cloudflare Workers**
The Auth Bridge will be implemented as a **Cloudflare Worker**.
- **Performance**: Sub-50ms global latency for polling requests.
- **Cost**: 100k free requests/day; $5/mo "Pro" tier for 10M requests.

### 2. Edge Storage: **Cloudflare D1 (SQLite)**
Ephemeral `device_code` and `user_code` pairs will be stored in **Cloudflare D1**.
- **Schema**: `auth_codes (device_code PK, user_code, status, sub, ttl)`.
- **Retention**: Records are ephemeral, with a 10-minute TTL enforced at the application layer.

### 3. Local Parity: **Wrangler (Miniflare)**
Local development will utilize **Wrangler** inside **Podman Compose**, providing 100% fidelity with the production Cloudflare environment without host-level dependencies.

### 4. Reverse Proxy & CORS
Cloudflare will serve as the unified entry point. We will map `iamrichardd.com/api/auth/*` to the Worker, eliminating the need for CORS preflight and complex origin management.

## Rationale
Cloudflare Workers provide a superior "DX" (Developer Experience) and "UX" (User Experience) for polling-intensive flows like RFC 8628. The $5/mo "Pro" tier provides a more predictable cost ceiling than AWS's granular per-request pricing as we scale beyond the initial 50k users.

## Impact
- **UX**: Handshakes feel instantaneous globally.
- **Security**: Reduced attack surface; no raw AWS URLs exposed to the client.
- **Maintenance**: Simplified IaC; Cloudflare handles the edge distribution.

## Verification Plan
- [ ] `wrangler dev --local` succeeds in Podman.
- [ ] Integration test verifies `PENDING` -> `APPROVED` -> `TOKEN` flow.
- [ ] D1 migrations are managed via `wrangler d1 migrations`.
