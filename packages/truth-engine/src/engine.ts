/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Core
 * File: engine.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Event-driven state machine for manufacturer data synchronization.
 * Traceability: Issue #46, ADR-0017 (Option 3)
 * ======================================================================== */

import Database from 'better-sqlite3';
import { chromium } from '@playwright/test';

// State Types
export type SyncState = 'STALE' | 'PENDING_VERIFICATION' | 'DIVE_REQUIRED' | 'HEALTHY' | 'BROKEN';

export interface Resource {
    id: number;
    mfr_id: number;
    resource_type: string;
    uri: string;
    etag?: string;
    last_modified?: string;
    sync_state: SyncState;
}

export class TruthEngine {
    private db: Database.Database;

    constructor(dbPath: string = 'data/truth_engine.db') {
        this.db = new Database(dbPath);
        this.initializeSchema();
    }

    private initializeSchema() {
        const schema = `
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
                last_modified TEXT,
                content_hash TEXT,
                sync_state TEXT DEFAULT 'STALE',
                last_checked_at DATETIME,
                failure_count INTEGER DEFAULT 0,
                FOREIGN KEY (mfr_id) REFERENCES manufacturers(id)
            );
            CREATE TABLE IF NOT EXISTS sync_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resource_id INTEGER NOT NULL,
                status_code INTEGER,
                action_taken TEXT,
                message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resource_id) REFERENCES resources(id)
            );
        `;
        this.db.exec(schema);
    }

    async sleep(min = 2000, max = 5000) {
        const ms = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkVitality(resource: Resource): Promise<SyncState> {
        try {
            const response = await fetch(resource.uri, { method: 'HEAD' });
            
            if (!response.ok) {
                return response.status === 404 ? 'BROKEN' : 'STALE';
            }

            const newEtag = response.headers.get('etag');
            const newLastMod = response.headers.get('last-modified');

            if (newEtag === resource.etag && newLastMod === resource.last_modified) {
                return 'HEALTHY';
            }

            return 'DIVE_REQUIRED';
        } catch (error) {
            return 'BROKEN';
        }
    }

    updateState(id: number, state: SyncState, metadata?: { etag?: string, last_modified?: string }) {
        const stmt = this.db.prepare(`
            UPDATE resources 
            SET sync_state = ?, etag = ?, last_modified = ?, last_checked_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        stmt.run(state, metadata?.etag || null, metadata?.last_modified || null, id);
    }

    async discover(mfrName: string) {
        const mfr = this.db.prepare('SELECT * FROM manufacturers WHERE name = ?').get(mfrName) as any;
        if (!mfr) throw new Error(`Manufacturer ${mfrName} not found in Truth Engine.`);

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        page.on('response', response => {
            const url = response.url();
            if (url.endsWith('.pdf') || url.match(/\.(jpg|jpeg|png|webp)$/i)) {
                this.registerResource(mfr.id, url, url.endsWith('.pdf') ? 'PDF' : 'IMAGE');
            }
        });

        await page.goto(mfr.base_url);
        await this.sleep(3000, 6000);
        
        await page.evaluate(async () => {
            for (let i = 0; i < 3; i++) {
                window.scrollBy(0, window.innerHeight);
                await new Promise(r => setTimeout(r, 1000));
            }
        });

        await browser.close();
    }

    /**
     * Registers a discovered resource if it passes the SSRF Domain Sentinel.
     */
    public registerResource(mfrId: number, uri: string, type: string) {
        const mfr = this.db.prepare('SELECT host FROM manufacturers WHERE id = ?').get(mfrId) as any;
        if (!mfr) {
            console.warn(`[Security] Blocked resource registration for unknown manufacturer ID: ${mfrId}`);
            return;
        }

        const url = new URL(uri);
        const mfrHost = mfr.host;
        const baseDomain = mfrHost.startsWith('www.') ? mfrHost.substring(4) : mfrHost;

        // SSRF Sentinel: Only allow the manufacturer's own domain or subdomains
        if (url.hostname !== mfrHost && url.hostname !== baseDomain && !url.hostname.endsWith(`.${baseDomain}`)) {
            const msg = `Blocked unauthorized resource URI (Domain Mismatch): ${uri}`;
            console.warn(`[Security] ${msg}`);
            
            // Persistent Security Logging (Issue #47 Audit)
            // Note: We attempt to link this to the manufacturer's root HTML resource if it exists
            this.db.prepare(`
                INSERT INTO sync_logs (resource_id, status_code, action_taken, message)
                SELECT id, 403, 'BLOCKED', ? FROM resources WHERE mfr_id = ? AND resource_type = 'HTML' LIMIT 1
            `).run(msg, mfrId);
            
            return;
        }

        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO resources (mfr_id, resource_type, uri, sync_state)
            VALUES (?, ?, ?, 'STALE')
        `);
        stmt.run(mfrId, type, uri);
    }
}
