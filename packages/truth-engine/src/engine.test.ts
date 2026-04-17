/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: engine.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic verification of the Truth Engine state machine.
 * Traceability: Issue #46, Issue #47, PRACTICES.md#1
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TruthEngine } from './engine.js';
import { rmSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TEST_DB = 'data/test_truth_engine.db';

describe('TruthEngine', () => {
    let engine: TruthEngine;

    beforeEach(() => {
        if (existsSync(TEST_DB)) rmSync(TEST_DB);
        const dir = dirname(TEST_DB);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        
        engine = new TruthEngine(TEST_DB);
        
        // Use the internal DB connection for seeding to prevent locking/conflicts
        // @ts-ignore: Accessing private db for testing seeding
        const db = engine.db;
        
        db.prepare(`
            INSERT INTO manufacturers (id, name, scheme, host, catalog_path) 
            VALUES (1, 'Frymaster', 'https', 'www.frymaster.com', '/products')
        `).run();
    });

    afterEach(() => {
        // @ts-ignore
        engine.db.close();
        if (existsSync(TEST_DB)) rmSync(TEST_DB);
    });

    it('test_should_reconstruct_full_uri_from_components', () => {
        // @ts-ignore
        const mfr = engine.db.prepare('SELECT base_url FROM manufacturers WHERE name = ?').get('Frymaster') as any;
        expect(mfr.base_url).toBe('https://www.frymaster.com/products');
    });

    it('test_should_block_unauthorized_domain_when_registering_resource', () => {
        const maliciousUri = 'https://malicious-site.com/malware.pdf';
        engine.registerResource(1, maliciousUri, 'PDF');
        
        // @ts-ignore
        const resource = engine.db.prepare('SELECT * FROM resources WHERE uri = ?').get(maliciousUri);
        expect(resource).toBeUndefined();
    });

    it('test_should_allow_subdomain_of_authorized_host', () => {
        const subdomainUri = 'https://assets.frymaster.com/spec.pdf';
        engine.registerResource(1, subdomainUri, 'PDF');
        
        // @ts-ignore
        const resource = engine.db.prepare('SELECT * FROM resources WHERE uri = ?').get(subdomainUri) as any;
        expect(resource).toBeDefined();
    });

    it('test_should_allow_authorized_domain_when_registering_resource', () => {
        const validUri = 'https://www.frymaster.com/products/spec.pdf';
        engine.registerResource(1, validUri, 'PDF');
        
        // @ts-ignore
        const resource = engine.db.prepare('SELECT * FROM resources WHERE uri = ?').get(validUri) as any;
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
        // @ts-ignore
        const resource = engine.db.prepare('SELECT * FROM resources LIMIT 1').get() as any;
        
        engine.updateState(resource.id, 'STALE', { etag: 'match', last_modified: 'today' });
        
        // @ts-ignore
        const updatedResource = engine.db.prepare('SELECT * FROM resources LIMIT 1').get() as any;
        const nextState = await engine.checkVitality(updatedResource);
        
        expect(nextState).toBe('HEALTHY');
    });

    it('test_should_log_security_violation_to_sync_logs', () => {
        const maliciousUri = 'https://malicious-site.com/malware.pdf';
        
        // Seed a dummy root HTML resource for the log linkage
        // @ts-ignore
        engine.db.prepare("INSERT INTO resources (mfr_id, resource_type, uri, sync_state) VALUES (1, 'HTML', 'https://www.frymaster.com/products', 'STALE')").run();
        
        engine.registerResource(1, maliciousUri, 'PDF');
        
        // @ts-ignore
        const log = engine.db.prepare('SELECT * FROM sync_logs WHERE action_taken = ?').get('BLOCKED') as any;
        expect(log).toBeDefined();
        expect(log.message).toContain('Domain Mismatch');
    });
});
