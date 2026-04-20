/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Schema
 * File: schema.sql
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Authoritative schema definition for the Truth Engine.
 * Traceability: Issue #46, Issue #47, Issue #50, ADR-0017
 * ======================================================================== */

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

CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mfr_id INTEGER NOT NULL,
    resource_type TEXT NOT NULL,
    uri TEXT NOT NULL UNIQUE,
    etag TEXT,
    last_modified DATETIME,
    content_hash TEXT,
    sync_state TEXT DEFAULT 'STALE',
    last_checked_at DATETIME,
    failure_count INTEGER DEFAULT 0,
    FOREIGN KEY (mfr_id) REFERENCES manufacturers(id)
);

CREATE TABLE IF NOT EXISTS forensic_investigations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mfr_id INTEGER NOT NULL,
    resource_id INTEGER NOT NULL,
    raw_input TEXT NOT NULL,
    raw_input_hash TEXT NOT NULL,
    source_uri TEXT NOT NULL,
    rejection_reason TEXT NOT NULL,
    investigation_status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mfr_id) REFERENCES manufacturers(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id),
    UNIQUE(mfr_id, raw_input_hash)
);

CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mfr_id INTEGER,
    resource_id INTEGER,
    status_code INTEGER,
    action_taken TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mfr_id) REFERENCES manufacturers(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id)
);
