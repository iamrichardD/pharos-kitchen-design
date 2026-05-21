/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Manifest Integrity Test
 * File: packages/truth-engine/src/manifest_integrity.test.ts
 * Author: PMA (Orchestrator)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: High-rigor verification of manifest-driven security gates.
 * Traceability: Issue #118, ADR-0029
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { WasmDialectLoader } from './loader.js';

const TEST_DIR = './test_manifest_integrity';
const WASM_FILE = 'dummy.wasm';
const WASM_PATH = join(TEST_DIR, WASM_FILE);
const MANIFEST_PATH = join(TEST_DIR, 'manifest.json');

describe('WasmDialectLoader Manifest Integrity', () => {
    beforeEach(() => {
        if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR);
        writeFileSync(WASM_PATH, 'dummy content');
    });

    afterEach(() => {
        if (existsSync(WASM_PATH)) unlinkSync(WASM_PATH);
        if (existsSync(MANIFEST_PATH)) unlinkSync(MANIFEST_PATH);
        if (existsSync(TEST_DIR)) rmdirSync(TEST_DIR);
    });

    it('test_should_reject_loading_when_manifest_is_missing', async () => {
        expect(() => WasmDialectLoader.getManifestHash(WASM_PATH))
            .toThrow('SECURITY_VIOLATION: Missing manifest.json');
    });

    it('test_should_reject_loading_when_manifest_entry_is_missing', async () => {
        writeFileSync(MANIFEST_PATH, JSON.stringify({ 'other.wasm': 'some_hash' }));
        expect(() => WasmDialectLoader.getManifestHash(WASM_PATH))
            .toThrow('SECURITY_VIOLATION: No manifest entry found');
    });

    it('test_should_reject_loading_when_manifest_json_is_malformed', async () => {
        writeFileSync(MANIFEST_PATH, 'invalid json');
        expect(() => WasmDialectLoader.getManifestHash(WASM_PATH))
            .toThrow('SECURITY_VIOLATION: Failed to parse manifest.json');
    });

    it('test_should_reject_loading_when_physical_file_is_tampered', async () => {
        writeFileSync(MANIFEST_PATH, JSON.stringify({ [WASM_FILE]: 'sha256:correct_hash' }));
        // Mocking verifyHash failure
        const isValid = WasmDialectLoader.verifyHash(WASM_PATH, 'sha256:correct_hash');
        expect(isValid).toBe(false);
    });
});
