-- ========================================================================
-- Project: Pharos Kitchen Design (Project Prism)
-- Component: Truth Engine / Persistence
-- File: schema.sql
-- Author: Richard D. (https://github.com/iamrichardd)
-- License: FSL-1.1 (See LICENSE file for details)
-- Purpose: State machine schema for tracking manufacturer data vitality and forensics.
-- Traceability: Issue #47, Issue #48, ADR-0015, ADR-0017
-- ========================================================================

-- Manufacturers Table
CREATE TABLE IF NOT EXISTS manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    scheme TEXT NOT NULL DEFAULT 'https',
    host TEXT NOT NULL,
    catalog_path TEXT NOT NULL DEFAULT '/',
    base_url TEXT GENERATED ALWAYS AS (scheme || '://' || host || catalog_path) VIRTUAL,
    last_crawl_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Resources Table (The State Machine)
-- States: 'STALE', 'PENDING_VERIFICATION', 'DIVE_REQUIRED', 'HEALTHY', 'BROKEN'
CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mfr_id INTEGER NOT NULL,
    resource_type TEXT NOT NULL, -- 'HTML', 'PDF', 'IMAGE', 'RFA'
    uri TEXT NOT NULL UNIQUE,
    etag TEXT,
    last_modified TEXT,
    content_hash TEXT, -- SHA-256 for binary assets
    sync_state TEXT DEFAULT 'STALE',
    last_checked_at DATETIME,
    failure_count INTEGER DEFAULT 0,
    FOREIGN KEY (mfr_id) REFERENCES manufacturers(id)
);

-- Forensic Isolation Ward
CREATE TABLE IF NOT EXISTS forensic_investigations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mfr_id INTEGER NOT NULL,
    resource_id INTEGER NOT NULL,
    raw_input TEXT NOT NULL,
    raw_input_hash TEXT NOT NULL, -- SHA-256 hash for unique constraint
    source_uri TEXT NOT NULL,
    rejection_reason TEXT NOT NULL,
    investigation_status TEXT DEFAULT 'PENDING', -- PENDING, RESOLVED, IGNORED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mfr_id) REFERENCES manufacturers(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id),
    UNIQUE(mfr_id, raw_input_hash)
);

-- Sync Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER, -- NULL indicates a global system event
    status_code INTEGER,
    action_taken TEXT, -- 'HEAD_CHECK', 'FULL_DOWNLOAD', 'ABORTED', 'BLOCKED', 'FORENSIC_DEFERRAL'
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Initial Seed
INSERT OR IGNORE INTO manufacturers (name, scheme, host, catalog_path) 
VALUES ('Frymaster', 'https', 'www.frymaster.com', '/products');
