-- ========================================================================
-- Project: Pharos Kitchen Design (Project Prism)
-- Component: Auth-Bridge / Migration
-- File: 0001_passkey_schema.sql
-- Author: Richard D. (https://github.com/iamrichardd)
-- License: FSL-1.1 (See LICENSE file for details)
-- Purpose: Setup users, credentials for WebAuthn, and auth_codes.
-- Traceability: Issue #206, ADR 0050
-- Version: 1.0.0
-- Last Updated: 2025-03-07
-- ========================================================================

-- Users table for Passkey-First Identity
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'IKD',
    created_at INTEGER NOT NULL
);

-- Credentials table for WebAuthn public keys and metadata
CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL,
    device_type TEXT NOT NULL,
    backed_up INTEGER NOT NULL,
    transports TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- RFC 8628 Device Flow session tracking
CREATE TABLE IF NOT EXISTS auth_codes (
    device_code TEXT PRIMARY KEY,
    user_code TEXT NOT NULL,
    status TEXT NOT NULL, -- PENDING, APPROVED, EXPIRED, USED
    sub TEXT,
    access_token TEXT,
    id_token TEXT,
    refresh_token TEXT,
    ttl INTEGER NOT NULL
);
