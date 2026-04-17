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
import { join } from 'node:path';
import { chromium, Browser, Page } from '@playwright/test';

// State Types
type SyncState = 'STALE' | 'PENDING_VERIFICATION' | 'DIVE_REQUIRED' | 'HEALTHY' | 'BROKEN';

interface Resource {
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
                base_url TEXT NOT NULL
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
                last_checked_at DATETIME
            );
        `;
        this.db.exec(schema);
    }

    /**
     * Simulates human delay to avoid bot detection.
     */
    async sleep(min = 2000, max = 5000) {
        const ms = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Performs a lightweight HEAD check on a resource.
     */
    async checkVitality(resource: Resource): Promise<SyncState> {
        console.log(`[Pulse] Checking Vitality: ${resource.uri}`);
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
            console.error(`[Error] Vitality check failed for ${resource.uri}:`, error);
            return 'BROKEN';
        }
    }

    /**
     * Transitions a resource to a new state and updates persistence.
     */
    updateState(id: number, state: SyncState, metadata?: { etag?: string, last_modified?: string }) {
        const stmt = this.db.prepare(`
            UPDATE resources 
            SET sync_state = ?, etag = ?, last_modified = ?, last_checked_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        stmt.run(state, metadata?.etag || null, metadata?.last_modified || null, id);
        console.log(`[State] Resource ${id} transitioned to ${state}`);
    }

    /**
     * Discovers new resources for a manufacturer using Playwright.
     */
    async discover(mfrName: string) {
        const mfr = this.db.prepare('SELECT * FROM manufacturers WHERE name = ?').get(mfrName) as any;
        if (!mfr) throw new Error(`Manufacturer ${mfrName} not found in Truth Engine.`);

        console.log(`[Discovery] Starting deep crawl for ${mfrName}...`);
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        // 1. Intercept network for PDF/Image discovery
        page.on('response', response => {
            const url = response.url();
            if (url.endsWith('.pdf') || url.match(/\.(jpg|jpeg|png|webp)$/i)) {
                this.registerResource(mfr.id, url, url.endsWith('.pdf') ? 'PDF' : 'IMAGE');
            }
        });

        await page.goto(mfr.base_url);
        await this.sleep(3000, 6000);
        
        // Human-like scrolling to trigger lazy loads
        await page.evaluate(async () => {
            for (let i = 0; i < 5; i++) {
                window.scrollBy(0, window.innerHeight);
                await new Promise(r => setTimeout(r, 1000));
            }
        });

        await browser.close();
    }

    private registerResource(mfrId: number, uri: string, type: string) {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO resources (mfr_id, resource_type, uri, sync_state)
            VALUES (?, ?, ?, 'STALE')
        `);
        stmt.run(mfrId, type, uri);
    }
}
