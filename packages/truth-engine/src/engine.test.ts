/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: engine.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic verification of the Bake Engine and Registry Promotion.
 * Traceability: Issue #53 - ETL Bake, Issue #74
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TruthEngine } from './engine.js';
import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('TruthEngine: Bake & Promotion', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgRoot = join(__dirname, '..');
    const TEST_DB = join(pkgRoot, 'data', 'test_bake.db');
    const STAGING_DIR = join(pkgRoot, '.artifacts', 'test_staging');

    let engine: TruthEngine;

    beforeEach(async () => {
        if (existsSync(TEST_DB)) await rm(TEST_DB);
        engine = new TruthEngine(TEST_DB);
        await engine.init();
        
        const db = (engine as any)._db as DatabaseSync;
        db.prepare("INSERT INTO manufacturers (name, host) VALUES ('Frymaster', 'www.frymaster.com')").run();
    });

    afterEach(async () => {
        engine.close();
        if (existsSync(TEST_DB)) await rm(TEST_DB);
        if (existsSync(STAGING_DIR)) await rm(STAGING_DIR, { recursive: true, force: true });
    });

    it('test_should_promote_to_registry_when_normalization_succeeds', async () => {
        const db = (engine as any)._db as DatabaseSync;
        db.prepare("INSERT INTO resources (mfr_id, resource_type, uri, sync_state) VALUES (1, 'PDF', 'https://www.frymaster.com/manual.pdf', 'STALE')").run();
        
        const rawInput = "Model: FPRE217, Voltage: 208V, Category: Fryers";
        
        (engine as any).normalizer.normalize = async () => ({
            status: 'HEALTHY',
            data: {
                name: "High Efficiency Fryer",
                PKD_ModelNumber: "FPRE217",
                PKD_MainCategory: "Fryers",
                PKD_Voltage: "208V",
                PKD_BTU: "0"
            }
        });

        await engine.handleTransformation(1, rawInput);

        const registryEntry = db.prepare("SELECT * FROM equipment_registry WHERE sku = 'FPRE217'").get();
        expect(registryEntry).toBeDefined();
        expect(registryEntry.name).toBe("High Efficiency Fryer");
        expect(registryEntry.voltage).toBe("208V");
        expect(registryEntry.category).toBe("Fryers");
    });

    it('test_should_replace_existing_sku_when_updated_data_arrives', async () => {
        const db = (engine as any)._db as DatabaseSync;
        db.prepare("INSERT INTO resources (mfr_id, resource_type, uri, sync_state) VALUES (1, 'PDF', 'https://www.frymaster.com/manual.pdf', 'STALE')").run();
        
        const firstPromotion = {
            status: 'HEALTHY',
            data: { name: "Old Fryer", PKD_ModelNumber: "SKU-1" }
        };
        
        const secondPromotion = {
            status: 'HEALTHY',
            data: { name: "New Fryer", PKD_ModelNumber: "SKU-1" }
        };

        (engine as any).normalizer.normalize = async () => firstPromotion;
        await engine.handleTransformation(1, "raw1");
        
        (engine as any).normalizer.normalize = async () => secondPromotion;
        await engine.handleTransformation(1, "raw2");

        const count = db.prepare("SELECT COUNT(*) as count FROM equipment_registry WHERE sku = 'SKU-1'").get().count;
        const entry = db.prepare("SELECT name FROM equipment_registry WHERE sku = 'SKU-1'").get();
        
        expect(count).toBe(1);
        expect(entry.name).toBe("New Fryer");
    });

    it('test_should_bake_sharded_json_when_registry_is_populated', async () => {
        const db = (engine as any)._db as DatabaseSync;
        db.prepare("INSERT INTO resources (mfr_id, resource_type, uri, sync_state) VALUES (1, 'PDF', 'https://www.frymaster.com/manual.pdf', 'STALE')").run();
        
        const metadata = {
            name: 'Super Fryer',
            metadata_id: 'FRY-101',
            parameters: {
                PKD_Manufacturer: 'Frymaster',
                PKD_ModelNumber: 'FRY-101',
                PKD_MainCategory: 'Fryers',
                PKD_TargetMarket: 'Commercial',
                PKD_Voltage: '208V',
                PKD_Phase: 3,
                PKD_Wattage: '4500W',
                PKD_BTU: '0',
                PKD_DrainConnection: '2"',
                PKD_DocLinks: [],
                PKD_Industry: ['Foodservice'],
                PKD_TargetRegions: ['US'],
                PKD_AssetViews: {}
            }
        };

        db.prepare(`
            INSERT INTO equipment_registry (mfr_id, resource_id, sku, name, category, metadata)
            VALUES (1, 1, 'FRY-101', 'Super Fryer', 'Fryers', ?)
        `).run(JSON.stringify(metadata));

        const count = await engine.bake(STAGING_DIR);
        expect(count).toBe(1);

        const filePath = join(STAGING_DIR, 'shard_frymaster_fryers.json');

        expect(existsSync(filePath)).toBe(true);
        
        const shardData = JSON.parse(await readFile(filePath, 'utf-8'));
        expect(shardData.shard_id).toBe('frymaster_fryers');
        
        const content = shardData.records['FRY-101'];
        expect(content.metadata_id).toBe('FRY-101');
        expect(content.parameters.PKD_Voltage).toBe('208V');
    });

    it('test_should_perform_atomic_wipe_before_bake', async () => {
        await mkdir(STAGING_DIR, { recursive: true });
        const zombieFile = join(STAGING_DIR, 'zombie.json');
        await writeFile(zombieFile, '{}');

        await engine.bake(STAGING_DIR);
        
        expect(existsSync(zombieFile)).toBe(false);
    });

    it('test_should_load_dialects_from_custom_env_path', async () => {
        const customDir = join(pkgRoot, '.artifacts', 'custom_patterns');
        const { mkdirSync, writeFileSync, existsSync, rmSync } = await import('node:fs');
        if (!existsSync(customDir)) mkdirSync(customDir, { recursive: true });
        
        const dialect = {
            manufacturer: "CustomMfr",
            rules: [{
                id: "custom-rule",
                weight: 100,
                mappings: { "test": "SUCCESS" }
            }]
        };
        writeFileSync(join(customDir, 'custom.json'), JSON.stringify(dialect));

        const originalEnv = process.env.PKD_PATTERN_DIR;
        const customEnvDb = join(pkgRoot, 'data', 'custom_test.db');

        try {
            process.env.PKD_PATTERN_DIR = customDir;
            
            const customEngine = new TruthEngine(customEnvDb);
            await customEngine.init();
            
            const result = await (customEngine as any).normalizer.normalize(1, 'CustomMfr', 'SUCCESS', 'https://test.com');
            expect(result.status).toBe('HEALTHY');
            customEngine.close();
        } finally {
            process.env.PKD_PATTERN_DIR = originalEnv;
            rmSync(customDir, { recursive: true, force: true });
            if (existsSync(customEnvDb)) rmSync(customEnvDb);
        }
    });
});

async function writeFile(path: string, content: string) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(path, content);
}
