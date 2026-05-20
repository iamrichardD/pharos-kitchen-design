/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: shard_bake.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of Lean JSON Shard generation.
 * Traceability: Issue #124 - Bake Engine Sharding
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TruthEngine } from './engine.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('TruthEngine: Shard Bake', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgRoot = join(__dirname, '..');
    const TEST_DB = join(pkgRoot, 'data', 'test_shard_bake.db');
    const STAGING_DIR = join(pkgRoot, '.artifacts', 'test_shard_staging');

    let engine: TruthEngine;

    beforeEach(async () => {
        if (existsSync(TEST_DB)) await rm(TEST_DB);
        engine = new TruthEngine(TEST_DB);
        await engine.init();
        
        const db = (engine as any)._db;
        db.prepare("INSERT INTO manufacturers (name, host) VALUES ('True Manufacturing', 'www.truemfg.com')").run();
        db.prepare("INSERT INTO manufacturers (name, host) VALUES ('Frymaster', 'www.frymaster.com')").run();
    });

    afterEach(async () => {
        engine.close();
        if (existsSync(TEST_DB)) await rm(TEST_DB);
        if (existsSync(STAGING_DIR)) await rm(STAGING_DIR, { recursive: true, force: true });
    });

    it('test_should_generate_lean_shards_when_bake_is_called', async () => {
        const db = (engine as any)._db;
        
        const metadataTrue = {
            metadata_id: 'T-49-HC',
            name: 'Reach-In Refrigerator',
            schema_version: '1.0.0',
            classification: { omniclass_table_23: '23-33 11 11', category: 'Refrigeration' },
            parameters: { PKD_Manufacturer: 'True Manufacturing', PKD_ModelNumber: 'T-49-HC', PKD_MainCategory: 'Refrigeration' },
            lod_geometry_specs: {},
            performance_metadata: { estimated_rfa_size_kb: 100, procedural_lod_enabled: true, ghost_link_active: false }
        };

        const metadataFryer = {
            metadata_id: 'FPRE217',
            name: 'Electric Fryer',
            schema_version: '1.0.0',
            classification: { omniclass_table_23: '23-33 11 13', category: 'Fryers' },
            parameters: { PKD_Manufacturer: 'Frymaster', PKD_ModelNumber: 'FPRE217', PKD_MainCategory: 'Fryers' },
            lod_geometry_specs: {},
            performance_metadata: { estimated_rfa_size_kb: 150, procedural_lod_enabled: true, ghost_link_active: false }
        };

        db.prepare("INSERT INTO equipment_registry (mfr_id, sku, name, category, metadata) VALUES (1, 'T-49-HC', 'Reach-In Refrigerator', 'Refrigeration', ?)").run(JSON.stringify(metadataTrue));
        db.prepare("INSERT INTO equipment_registry (mfr_id, sku, name, category, metadata) VALUES (2, 'FPRE217', 'Electric Fryer', 'Fryers', ?)").run(JSON.stringify(metadataFryer));

        await engine.bake(STAGING_DIR);

        const trueShardPath = join(STAGING_DIR, 'shard_true_manufacturing_refrigeration.json');
        const frymasterShardPath = join(STAGING_DIR, 'shard_frymaster_fryers.json');

        expect(existsSync(trueShardPath)).toBe(true);
        expect(existsSync(frymasterShardPath)).toBe(true);

        const trueShard = JSON.parse(await readFile(trueShardPath, 'utf-8'));
        expect(trueShard.shard_id).toBe('true_manufacturing_refrigeration');
        expect(trueShard.v).toBe('1.0.0');
        expect(trueShard.records['T-49-HC']).toBeDefined();
        expect(trueShard.records['T-49-HC'].name).toBe('Reach-In Refrigerator');
        expect(trueShard.records['T-49-HC'].pkd_prologue).toBeUndefined(); // Requirement: REJECTED from data
    });
});
