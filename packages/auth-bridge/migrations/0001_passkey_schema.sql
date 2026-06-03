-- Migration: 0001_passkey_schema.sql
-- Purpose: Setup users, credentials for WebAuthn, and auth_codes.

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'IKD',
    created_at INTEGER NOT NULL
);

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

CREATE TABLE IF NOT EXISTS auth_codes (
    device_code TEXT PRIMARY KEY,
    user_code TEXT NOT NULL,
    status TEXT NOT NULL,
    sub TEXT,
    access_token TEXT,
    id_token TEXT,
    refresh_token TEXT,
    ttl INTEGER NOT NULL
);