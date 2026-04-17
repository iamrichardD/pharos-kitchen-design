/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: engine.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic verification of the Truth Engine state machine.
 * Traceability: Issue #46, PRACTICES.md#1 (TDD Traceability)
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TruthEngine } from './engine.js';
import Database from 'better-sqlite3';
import { rmSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TEST_DB = 'data/test_truth_engine.db';

describe('TruthEngine', () => {
    let engine: TruthEngine;
    let db: Database.Database;

    beforeEach(() => {
        if (existsSync(TEST_DB)) rmSync(TEST_DB);
        const dir = dirname(TEST_DB);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        
        engine = new TruthEngine(TEST_DB);
        db = new Database(TEST_DB);
        
        // Seed a manufacturer
        db.prepare("INSERT INTO manufacturers (name, base_url) VALUES ('Frymaster', 'https://www.frymaster.com')").run();
    });

    afterEach(() => {
        db.close();
        if (existsSync(TEST_DB)) rmSync(TEST_DB);
    });

    it('test_should_block_unauthorized_domain_when_registering_resource', () => {
        const maliciousUri = 'http://169.254.169.254/latest/meta-data/';
        engine.registerResource(1, maliciousUri, 'HTML');
        
        const resource = db.prepare('SELECT * FROM resources WHERE uri = ?').get(maliciousUri);
        expect(resource).toBeUndefined();
    });

    it('test_should_allow_authorized_domain_when_registering_resource', () => {
        const validUri = 'https://www.frymaster.com/products/spec.pdf';
        engine.registerResource(1, validUri, 'PDF');
        
        const resource = db.prepare('SELECT * FROM resources WHERE uri = ?').get(validUri) as any;
        expect(resource).toBeDefined();
        expect(resource.sync_state).toBe('STALE');
    });

    it('test_should_transition_to_healthy_when_etag_matches', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: new Map([
                ['etag', 'match'],
                ['last-modified', 'today']
            ])
        });

        engine.registerResource(1, 'https://www.frymaster.com/spec.pdf', 'PDF');
        const resource = db.prepare('SELECT * FROM resources LIMIT 1').get() as any;
        
        engine.updateState(resource.id, 'STALE', { etag: 'match', last_modified: 'today' });
        
        const updatedResource = db.prepare('SELECT * FROM resources LIMIT 1').get() as any;
        const nextState = await engine.checkVitality(updatedResource);
        
        expect(nextState).toBe('HEALTHY');
    });
});
