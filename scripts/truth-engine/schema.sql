-- ========================================================================
-- Project: Pharos Kitchen Design (Project Prism)
-- Component: Truth Engine / Persistence
-- File: schema.sql
-- Author: Richard D. (https://github.com/iamrichardd)
-- License: FSL-1.1 (See LICENSE file for details)
-- Purpose: State machine schema for tracking manufacturer data vitality.
-- Traceability: Issue #47, ADR-0015, ADR-0017
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

-- Sync Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER, -- NULL indicates a global system event
    status_code INTEGER,
    action_taken TEXT, -- 'HEAD_CHECK', 'FULL_DOWNLOAD', 'ABORTED', 'BLOCKED'
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Initial Seed
INSERT OR IGNORE INTO manufacturers (name, scheme, host, catalog_path) 
VALUES ('Frymaster', 'https', 'www.frymaster.com', '/products');
