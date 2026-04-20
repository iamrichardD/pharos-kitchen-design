<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Schema
 * File: SCHEMA.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified Entity Relationship Diagram and Schema Specification.
 * Traceability: ADR-0015, ADR-0017, Issue #47
 * ======================================================================== -->

# 🗺️ Pharos Entity Relationship Diagram (ERD)

This document serves as the **Unified Source of Truth** for the Pharos Kitchen Design monorepo. It bridges the gap between the **Truth Engine (SQLite)** and the **Auth-Bridge (Cloudflare D1)**.

## 1. System Visualization

```mermaid
erDiagram
    MANUFACTURER ||--o{ RESOURCE : "owns"
    MANUFACTURER ||--o{ FORENSIC_INVESTIGATION : "flags slop"
    MANUFACTURER ||--o{ SYNC_LOG : "audits global events"
    RESOURCE ||--o{ SYNC_LOG : "audits"
    RESOURCE ||--o{ FORENSIC_INVESTIGATION : "isolates"
    
    MANUFACTURER {
        int id PK
        string name UK
        string scheme "Default: https"
        string host "Manufacturer Domain"
        string catalog_path
        string base_url "Generated Virtual Column"
        datetime last_crawl_at
        datetime created_at
    }

    RESOURCE {
        int id PK
        int mfr_id FK
        string resource_type "PDF | IMAGE | RFA"
        string uri UK
        string etag "HTTP ETag Header"
        datetime last_modified "HTTP Last-Modified Header"
        string content_hash "SHA-256 for binary assets"
        string sync_state "STALE | HEALTHY | BROKEN | DIVE_REQUIRED"
        datetime last_checked_at
        int failure_count
    }

    FORENSIC_INVESTIGATION {
        int id PK
        int mfr_id FK
        int resource_id FK
        string raw_input "Unstructured Slop"
        string raw_input_hash UK "SHA-256"
        string source_uri
        string rejection_reason
        string investigation_status "PENDING | RESOLVED | IGNORED"
        datetime created_at
    }

    SYNC_LOG {
        int id PK
        int mfr_id FK "NULL for truly global events"
        int resource_id FK "NULL for Global Events"
        int status_code
        string action_taken "HEAD_CHECK | BLOCKED | FORENSIC_DEFERRAL"
        string message
        datetime created_at
    }

    %% Identity Bridge (RFC 8628 Device Authorization)
    AUTH_CODE {
        string device_code PK
        string user_code UK
        string status "PENDING | APPROVED | EXPIRED | USED"
        string sub "Cognito Subject Identifier"
        string access_token "JWT"
        string id_token "JWT"
        string refresh_token "JWT"
        int ttl "Unix Timestamp (seconds)"
    }
```

## 2. Implementation Mandates

### Type Invariants
*   **Timestamps**: All temporal fields MUST use `DATETIME` or `TIMESTAMP` formats. Raw strings (e.g., "today") are strictly prohibited in production tables.
*   **Hashes**: Content and raw input hashes MUST use **SHA-256** to ensure collision resistance and deterministic deduplication.
*   **Enums**: While SQLite does not support native Enums, implementation logic (e.g., `TruthEngine`) MUST enforce strict validation against the documented states.

### Security Boundaries
*   **SSRF Domain Sentinel**: The `RESOURCE.uri` must be validated against the `MANUFACTURER.host` before registration.
*   **Token Isolation**: `AUTH_CODE` tokens are transient and intended for initial device registration. Long-term storage of these tokens requires field-level encryption (Future ADR).
