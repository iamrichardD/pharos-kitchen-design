/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: engine.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic verification of the Bake Engine and Registry Promotion.
 * Traceability: Issue #53 - ETL Bake
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TruthEngine } from './engine.js';
import { join } from 'node:path';
import { rm, mkdir, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('TruthEngine: Bake & Promotion', () => {
    let engine: TruthEngine;
    const TEST_DB = 'data/test_bake.db';
    const STAGING_DIR = '.artifacts/test_staging';

    beforeEach(async () => {
        if (existsSync(TEST_DB)) await rm(TEST_DB);
        engine = new TruthEngine(TEST_DB);
        await engine.init();
        
        // Setup mock manufacturer
        const db = (engine as any)._db;
        db.prepare("INSERT INTO manufacturers (name, host) VALUES ('Frymaster', 'www.frymaster.com')").run();
    });

    afterEach(async () => {
        engine.close();
        if (existsSync(TEST_DB)) await rm(TEST_DB);
        if (existsSync(STAGING_DIR)) await rm(STAGING_DIR, { recursive: true, force: true });
    });

    it('test_should_promote_to_registry_when_normalization_succeeds', async () => {
        const db = (engine as any)._db;
        db.prepare("INSERT INTO resources (mfr_id, resource_type, uri, sync_state) VALUES (1, 'PDF', 'https://www.frymaster.com/manual.pdf', 'STALE')").run();
        
        // Mock a healthy normalization by the ForensicNormalizer (simulated)
        // We'll manually trigger handleTransformation with data that matches a dialect
        // For this test, we assume the normalizer is working and focus on the engine's promotion logic.
        
        const rawInput = "Model: FPRE217, Voltage: 208V, Category: Fryers";
        
        // Force a successful match in the mock normalizer logic (by providing valid fields)
        // Since we are testing TruthEngine.handleTransformation, we need the ForensicNormalizer 
        // to return a HEALTHY result.
        
        // We'll mock the normalizer's behavior by overriding the method for this test instance
        (engine as any).normalizer.normalize = () => ({
            status: 'HEALTHY',
            data: {
                name: "High Efficiency Fryer",
                PKD_ModelNumber: "FPRE217",
                PKD_MainCategory: "Fryers",
                PKD_Voltage: "208V",
                PKD_BTU: "0"
            }
        });

        engine.handleTransformation(1, rawInput);

        const registryEntry = db.prepare("SELECT * FROM equipment_registry WHERE sku = 'FPRE217'").get();
        expect(registryEntry).toBeDefined();
        expect(registryEntry.name).toBe("High Efficiency Fryer");
        expect(registryEntry.voltage).toBe("208V");
        expect(registryEntry.category).toBe("Fryers");
    });

    it('test_should_replace_existing_sku_when_updated_data_arrives', async () => {
        const db = (engine as any)._db;
        db.prepare("INSERT INTO resources (mfr_id, resource_type, uri, sync_state) VALUES (1, 'PDF', 'https://www.frymaster.com/manual.pdf', 'STALE')").run();
        
        const firstPromotion = {
            status: 'HEALTHY',
            data: { name: "Old Fryer", PKD_ModelNumber: "SKU-1" }
        };
        
        const secondPromotion = {
            status: 'HEALTHY',
            data: { name: "New Fryer", PKD_ModelNumber: "SKU-1" }
        };

        (engine as any).normalizer.normalize = () => firstPromotion;
        engine.handleTransformation(1, "raw1");
        
        (engine as any).normalizer.normalize = () => secondPromotion;
        engine.handleTransformation(1, "raw2");

        const count = db.prepare("SELECT COUNT(*) as count FROM equipment_registry WHERE sku = 'SKU-1'").get().count;
        const entry = db.prepare("SELECT name FROM equipment_registry WHERE sku = 'SKU-1'").get();
        
        expect(count).toBe(1);
        expect(entry.name).toBe("New Fryer");
    });

    it('test_should_bake_sharded_json_when_registry_is_populated', async () => {
        const db = (engine as any)._db;
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

        const mfrPath = join(STAGING_DIR, 'frymaster');
        const catPath = join(mfrPath, 'fryers');
        const filePath = join(catPath, 'FRY-101.json');

        expect(existsSync(filePath)).toBe(true);
        
        const content = JSON.parse(await readFile(filePath, 'utf-8'));
        expect(content.sku).toBe('FRY-101');
        expect(content.manufacturer).toBe('Frymaster');
        expect(content.pkd_prologue).toBeDefined();
        expect(content.parameters.PKD_Voltage).toBe('208V');
    });

    it('test_should_perform_atomic_wipe_before_bake', async () => {
        await mkdir(STAGING_DIR, { recursive: true });
        const zombieFile = join(STAGING_DIR, 'zombie.json');
        await writeFile(zombieFile, '{}');

        await engine.bake(STAGING_DIR);
        
        expect(existsSync(zombieFile)).toBe(false);
    });
});

async function writeFile(path: string, content: string) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(path, content);
}
