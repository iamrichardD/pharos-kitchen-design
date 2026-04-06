/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / AWS Architecture
 * File: 0019-aws-serverless-auth-bridge.md
 * Status: Proposed
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Detailed implementation plan for the RFC 8628 AWS Bridge.
 * Traceability: ADR 0018, RFC 8628
 * ======================================================================== */

# ADR 0019: AWS Serverless Auth Bridge Implementation

## Context
ADR 0018 established AWS Cognito as our IdP and RFC 8628 as our cross-platform flow. Since Cognito lacks native support for the "Device Authorization Grant," we must implement a high-rigor serverless bridge using AWS Lambda and DynamoDB.

## Decision

### 1. DynamoDB Schema (Table: `pharos-auth-codes`)
We will use a single DynamoDB table with a TTL (Time to Live) attribute to manage the lifecycle of ephemeral authorization codes.

| Attribute | Type | Role | Description |
| :--- | :--- | :--- | :--- |
| `device_code` | S (PK) | Partition Key | High-entropy UUID (e.g., `42f6...`) |
| `user_code` | S (GSI) | Index | Human-readable 8-char code (e.g., `ABCD-1234`) |
| `status` | S | Metadata | `PENDING`, `APPROVED`, `EXPIRED`, `USED` |
| `sub` | S | Payload | Cognito `sub` (User ID) after approval |
| `tokens` | M | Payload | Encrypted Refresh/Access tokens (optional/cache) |
| `ttl` | N | Control | Epoch timestamp for automatic deletion (5-10 min) |

### 2. Lambda Endpoints (Package: `packages/auth-bridge`)

- **`POST /auth/device`**:
    - Validates `client_id`.
    - Generates `device_code` and `user_code`.
    - Writes to DynamoDB with `status: PENDING`.
    - Returns `verification_uri` (Marketing Site).

- **`POST /auth/confirm` (Accessed by Marketing Site)**:
    - User provides `user_code` + Cognito ID Token.
    - Lambda validates ID Token signature via JWKs.
    - Updates DynamoDB: `status: APPROVED`, `sub: <id_token.sub>`.

- **`POST /auth/token` (Polling Endpoint)**:
    - CLI/Revit polls with `device_code`.
    - If `PENDING`: Returns `authorization_pending` (400).
    - If `APPROVED`: Performs an "Admin Auth" or Token Exchange with Cognito to generate actual JWTs for the user.
    - Updates DynamoDB: `status: USED`.

### 3. IAM Least-Privilege
- Lambda role only has `dynamodb:PutItem`, `dynamodb:UpdateItem`, and `dynamodb:GetItem` access to the `pharos-auth-codes` table.
- `cognito-idp:AdminInitiateAuth` (optional) restricted to the specific Pharos User Pool.

## Rationale
Using DynamoDB's native TTL ensures we don't leak "abandoned" codes, maintaining a clean security posture without manual cleanup logic. The split between `user_code` and `device_code` adheres strictly to the security properties of RFC 8628.

## Impact
- **Developer Experience**: CLI and Revit developers have a standard OIDC-like interface.
- **Maintenance**: Zero-maintenance due to serverless primitives.
- **Latency**: Sub-50ms code generation and polling.

## Local Development & Testing Strategy (ZERO-HOST)

To comply with the Project Prism "Zero-Host" mandate, local development will utilize **Podman Compose** to simulate the AWS environment.

### 1. Local Stack Components
- **DynamoDB**: `public.ecr.aws/aws-dynamodb-local/aws-dynamodb-local` (Port 8000).
- **Auth Bridge**: Node.js container running the Lambda logic via `ts-node` and a lightweight HTTP wrapper.
- **Mock IdP**: A minimal OIDC server to simulate Cognito user pools and JWT signing.

### 2. Automated Validation (`Containerfile.test`)
Validation of the RFC 8628 flow will be performed by a dedicated test container:
1. **Setup**: `podman-compose up -d` (DynamoDB + Bridge).
2. **Execution**: A Node.js test script (Vitest/Playwright) performs:
    - `POST /auth/device` -> Captures `device_code`.
    - `POST /auth/confirm` -> Mocks user login and updates DynamoDB status.
    - `POST /auth/token` -> Polls until success and verifies the returned JWT.
3. **Teardown**: `podman-compose down -v`.

### 3. Environment Parity
We will use the `@aws-sdk/client-dynamodb` with a custom `endpoint` configuration:
```typescript
const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://auth-db:8000",
  region: "us-east-1"
});
```

## Verification Plan (TDD)
- [ ] `test_should_generate_valid_pair_when_requested`: Verify `device_code` is high entropy.
- [ ] `test_should_reject_poll_when_pending`: Ensure correct OAuth2 error code (`authorization_pending`).
- [ ] `test_should_return_tokens_after_web_confirmation`: Verify the full handshake.
