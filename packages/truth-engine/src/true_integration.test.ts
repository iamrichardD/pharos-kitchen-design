/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: packages/truth-engine/src/true_integration.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: End-to-end verification of WASM-based True Mfg normalization.
 * Traceability: Issue #62
 * ======================================================================== */

import { describe, it, expect, beforeEach } from 'vitest';
import { TruthEngine } from './engine.js';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { WasmDialectLoader } from './loader.js';

const WASM_PATH = '/work/dist/dialects/pkd_dialect_true.wasm';

describe('TruthEngine WASM Integration (True Mfg)', () => {
    let engine: TruthEngine;
    let db: DatabaseSync;

    beforeEach(async () => {
        db = new DatabaseSync(':memory:');
        engine = new TruthEngine(db);
        await engine.init();

        // Dynamic retrieval of authoritative hash (ADR-0029)
        const wasmHash = WasmDialectLoader.getManifestHash(WASM_PATH);

        // Setup True Manufacturing with WASM
        db.prepare(`
            INSERT INTO manufacturers (name, host, wasm_path, wasm_hash)
            VALUES ('True Manufacturing', 'www.truemfg.com', ?, ?)
        `).run(WASM_PATH, wasmHash);

        // Register a resource
        db.prepare(`
            INSERT INTO resources (mfr_id, resource_type, uri, sync_state)
            VALUES (1, 'PAGE', 'https://www.truemfg.com/product/tdd-1-hc/', 'STALE')
        `).run();
    });

    it('test_should_promote_to_registry_when_wasm_extracts_valid_metadata', async () => {
        const rawInput = "Product Specifications: Voltage 115/60/1, Amps: 1.4, Weight 200lbs. PKD_ProductNumber: TDD-1-HC";
        
        await engine.handleTransformation(1, rawInput);
        
        const registryEntry = db.prepare("SELECT * FROM equipment_registry WHERE sku = 'TDD-1-HC'").get();
        expect(registryEntry).toBeDefined();
        expect(registryEntry.voltage).toBe('115/60/1');
        
        const metadata = JSON.parse(registryEntry.metadata);
        expect(metadata.PKD_Amps).toBe(1.4);
    });

    it('test_should_defer_to_forensic_when_wasm_fails_to_extract_sku', async () => {
        const rawInput = "Voltage 115/60/1 but no SKU here";
        
        await engine.handleTransformation(1, rawInput);
        
        const registryEntry = db.prepare("SELECT * FROM equipment_registry").get();
        expect(registryEntry).toBeUndefined();
        
        const investigation = db.prepare("SELECT * FROM forensic_investigations WHERE resource_id = 1").get();
        expect(investigation).toBeDefined();
        expect(investigation.rejection_reason).toBe('MISSING_SKU');
    });
});
