<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Infrastructure
 * File: 0021-cloudflare-edge-auth-bridge.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Pivoting the Auth Bridge to Cloudflare Workers and D1 for performance.
 * Traceability: ADR 0018, ADR 0019, ADR 0020
 * Status: Approved
 * ======================================================================== -->

# ADR 0021: Cloudflare Edge Auth Bridge

## Context
ADR 0019 proposed an AWS Lambda + DynamoDB bridge. While cost-effective, it introduces region-specific latency during the RFC 8628 polling phase. To provide a superior "Command-First" UX, we require edge-native execution and predictable billing.

## Decision

### 1. Edge-Native Logic: **Cloudflare Workers**
The Auth Bridge will be implemented as a **Cloudflare Worker**.
- **Performance**: Sub-50ms global latency for polling requests.
- **Cost**: 100k free requests/day; $5/mo "Pro" tier for 10M requests.

### 2. Edge Storage: **Cloudflare D1 (SQLite)**
Both ephemeral auth codes and persistent user state will be stored in **Cloudflare D1**.
- **Ephemeral Schema**: `auth_codes (device_code PK, user_code, status, sub, ttl)`.
- **Persistent Schema**: `user_state (sub PK, email, pkd_role, org_id, created_at, last_login)`.
- **Retention**: Auth codes are ephemeral (10-minute TTL); user state is persistent and authoritative.

### 3. Local Parity: **Wrangler (Miniflare)**
Local development will utilize **Wrangler** inside **Podman Compose**, providing 100% fidelity with the production Cloudflare environment without host-level dependencies.

### 4. Reverse Proxy & CORS
Cloudflare will serve as the unified entry point. We will map `iamrichardd.com/api/auth/*` to the Worker, eliminating the need for CORS preflight and complex origin management.

## Rationale
Cloudflare Workers provide a superior "DX" (Developer Experience) and "UX" (User Experience) for polling-intensive flows like RFC 8628. By migrating user state from AWS DynamoDB to Cloudflare D1, we eliminate the **50ms–200ms "Cross-Cloud Latency"** incurred during network handshakes between the Cloudflare Edge and AWS Regions. D1's zero-egress model and sub-10ms edge-local read performance ensure that the "Command-First" UX remains snappy and zero-cost for long-term maintenance.

## Impact
- **UX**: Auth handshakes and profile lookups feel instantaneous globally.
- **Security**: Reduced attack surface; user state is co-located with the edge logic, minimizing data transit.
- **Maintenance**: Simplified IaC; Cloudflare handles the edge distribution and zero-egress state management.

## Verification Plan
- [ ] `wrangler dev --local` succeeds in Podman.
- [ ] Integration test verifies `PENDING` -> `APPROVED` -> `TOKEN` flow.
- [ ] D1 migrations are managed via `wrangler d1 migrations`.
