/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: packages/truth-engine/src/kcl.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of KCL Active Discovery and Domain Sentinel.
 * Traceability: Issue #62, ADR 0023
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TruthEngine } from './engine.js';
import { DatabaseSync } from 'node:sqlite';
import { rmSync, existsSync } from 'node:fs';

describe('TruthEngine KCL Integration', () => {
    let engine: TruthEngine;
    let db: DatabaseSync;

    beforeEach(async () => {
        db = new DatabaseSync(':memory:');
        engine = new TruthEngine(db);
        await engine.init();

        // Setup True Manufacturing
        db.prepare(`
            INSERT INTO manufacturers (name, host, catalog_path)
            VALUES ('True Manufacturing', 'www.truemfg.com', '/products/')
        `).run();
    });

    it('test_should_block_kcl_link_when_sentinel_is_strict', () => {
        const mfrId = 1;
        const kclUri = 'https://truefoodservice.kclcad.com/www/GetModelData/123';
        
        engine.registerResource(mfrId, kclUri, 'JSON');
        
        const resource = db.prepare('SELECT * FROM resources WHERE uri = ?').get(kclUri);
        expect(resource).toBeUndefined();
        
        const log = db.prepare("SELECT * FROM sync_logs WHERE action_taken = 'BLOCKED'").get();
        expect(log).toBeDefined();
    });

    it('test_should_allow_kcl_link_when_mfr_is_kcl_enabled', () => {
        const mfrId = 1;
        const kclUri = 'https://truefoodservice.kclcad.com/www/GetModelData/123';
        
        db.prepare('UPDATE manufacturers SET kcl_enabled = 1 WHERE id = ?').run(mfrId);
        
        engine.registerResource(mfrId, kclUri, 'JSON');
        
        const resource = db.prepare('SELECT * FROM resources WHERE uri = ?').get(kclUri);
        expect(resource).toBeDefined();
        expect(resource.uri).toBe(kclUri);
    });
});
