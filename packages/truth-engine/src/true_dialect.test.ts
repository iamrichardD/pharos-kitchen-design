/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: packages/truth-engine/src/true_dialect.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of True Manufacturing WASM dialect.
 * Traceability: Issue #62
 * ======================================================================== */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { WasmDialectLoader } from './loader.js';

const WASM_PATH = join(process.cwd(), '../../.artifacts/dialects/pkd_dialect_true.wasm');
const EXPECTED_HASH = '9c352bc1a102c904e14c16be9dcef2839a9685a2688ba584482129977f9477a4';

describe('True Manufacturing WASM Dialect', () => {
    it('test_should_extract_voltage_and_amps_from_true_mfg_specs', async () => {
        const plugin = await WasmDialectLoader.loadPlugin(WASM_PATH, EXPECTED_HASH);
        const rawInput = "Product Specifications: Voltage 115/60/1, Amps: 1.4, Weight 200lbs";
        const result = await WasmDialectLoader.normalize(plugin, 'True Manufacturing', rawInput);

        expect(result.status).toBe('Healthy');
        expect(result.parameters.PKD_Voltage).toBe('115/60/1');
        expect(result.parameters.PKD_Amps).toBe(1.4);
    });

    it('test_should_identify_kcl_discovery_strategy_when_uri_detected', async () => {
        const plugin = await WasmDialectLoader.loadPlugin(WASM_PATH, EXPECTED_HASH);
        const rawInput = "See assets at truefoodservice.kclcad.com";
        const result = await WasmDialectLoader.normalize(plugin, 'True Manufacturing', rawInput);

        expect(result.parameters.crawl_strategy).toBe('KCL_ACTIVE_DISCOVERY');
    });

    it('test_should_decode_kcl_base64_payload', async () => {
        const plugin = await WasmDialectLoader.loadPlugin(WASM_PATH, EXPECTED_HASH);
        // "Hello KCL" in Base64 is "SGVsbG8gS0NM"
        const payload = "SGVsbG8gS0NM";
        const output = await plugin.call('decode_kcl_payload', payload);
        expect(output.text()).toBe('Hello KCL');
    });
});
