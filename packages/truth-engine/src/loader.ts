/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / WASM Loader
 * File: packages/truth-engine/src/loader.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Secure dynamic loading of WASM-based manufacturer dialects.
 * Traceability: Issue #60, ADR 0017
 * ======================================================================== */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import createPlugin, { Plugin } from '@extism/extism';

export interface DialectBuffer {
    status: 'Healthy' | 'UnverifiedRawData' | 'Timeout' | 'Error';
    manufacturer: string;
    parameters: Record<string, any>;
    raw_input: string;
    rejection_reason?: string;
}

export class WasmDialectLoader {
    /**
     * Verifies the SHA-256 hash of a WASM module before instantiation.
     * Mandate: Shift-Left Security (ADR-0016).
     */
    public static verifyHash(wasmPath: string, expectedHash: string): boolean {
        const buffer = readFileSync(wasmPath);
        const actualHash = createHash('sha256').update(buffer).digest('hex');
        return actualHash === expectedHash;
    }

    /**
     * Loads and instantiates an Extism plugin from a WASM file.
     */
    public static async loadPlugin(wasmPath: string): Promise<Plugin> {
        const wasmBuffer = readFileSync(wasmPath);
        const plugin = await createPlugin({
            wasm: [{ data: wasmBuffer }]
        }, {
            useWasi: true,
        });
        return plugin;
    }

    /**
     * Invokes the 'normalize' function on a WASM dialect.
     */
    public static async normalize(
        plugin: Plugin,
        manufacturer: string,
        rawInput: string
    ): Promise<DialectBuffer> {
        const buffer: DialectBuffer = {
            status: 'UnverifiedRawData',
            manufacturer,
            parameters: {},
            raw_input: rawInput,
        };

        const inputJson = JSON.stringify(buffer);
        const output = await plugin.call('normalize', inputJson);
        const outputJson = output.text();
        
        return JSON.parse(outputJson) as DialectBuffer;
    }
}
