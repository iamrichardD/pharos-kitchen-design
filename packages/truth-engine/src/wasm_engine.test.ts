/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / WASM Integration Test
 * File: packages/truth-engine/src/wasm_engine.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of WASM-based dialect extraction and security.
 * Traceability: Issue #60, ADR 0017
 * ======================================================================== */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { WasmDialectLoader } from './loader.js';

const WASM_PATH = join(process.cwd(), '../dialects/pkd-dialect-frymaster/target/wasm32-unknown-unknown/release/pkd_dialect_frymaster.wasm');
const EXPECTED_HASH = '88bfc1531a354991afad872c48d6c1dd7a367a6e67888c98ff2b6f3ba34336b3';

describe('WasmDialectLoader', () => {
    it('test_should_verify_hash_successfully_when_artifact_is_authentic', () => {
        const isValid = WasmDialectLoader.verifyHash(WASM_PATH, EXPECTED_HASH);
        expect(isValid).toBe(true);
    });

    it('test_should_fail_verification_when_hash_mismatch_detected', () => {
        const isValid = WasmDialectLoader.verifyHash(WASM_PATH, 'wrong_hash');
        expect(isValid).toBe(false);
    });

    it('test_should_extract_metadata_via_wasm_when_provided_standard_string', async () => {
        const plugin = await WasmDialectLoader.loadPlugin(WASM_PATH);
        const result = await WasmDialectLoader.normalize(plugin, 'Frymaster', '208V 3PH 60HZ');

        expect(result.status).toBe('Healthy');
        expect(result.parameters.voltage).toBe(208);
        expect(result.parameters.phase).toBe(3);
        expect(result.parameters.hertz).toBe(60);
    });

    it('test_should_extract_metadata_via_wasm_when_provided_verbose_string', async () => {
        const plugin = await WasmDialectLoader.loadPlugin(WASM_PATH);
        const result = await WasmDialectLoader.normalize(plugin, 'Frymaster', 'Voltage: 480 Volts, 3 Phase');

        expect(result.status).toBe('Healthy');
        expect(result.parameters.voltage).toBe(480);
        expect(result.parameters.phase).toBe(3);
    });

    it('test_should_reject_data_when_no_dialect_patterns_match', async () => {
        const plugin = await WasmDialectLoader.loadPlugin(WASM_PATH);
        const result = await WasmDialectLoader.normalize(plugin, 'Frymaster', 'Unknown string');

        expect(result.status).toBe('UnverifiedRawData');
        expect(result.rejection_reason).toContain('No Frymaster patterns matched');
    });
});
