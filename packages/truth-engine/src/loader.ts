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
     * Mandate: Hash verification is an enforced, blocking gate.
     */
    public static async loadPlugin(wasmPath: string, expectedHash: string): Promise<Plugin> {
        if (!this.verifyHash(wasmPath, expectedHash)) {
            throw new Error(`SECURITY_VIOLATION: WASM artifact hash mismatch at ${wasmPath}`);
        }

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
     * Mandate: Host protection via execution timeouts.
     */
    public static async normalize(
        plugin: Plugin,
        manufacturer: string,
        rawInput: string,
        timeoutMs: number = 500 // 500ms default timeout
    ): Promise<DialectBuffer> {
        const buffer: DialectBuffer = {
            status: 'UnverifiedRawData',
            manufacturer,
            parameters: {},
            raw_input: rawInput,
        };

        const inputJson = JSON.stringify(buffer);
        
        try {
            // Mandate: Extism call with host protection (timeout)
            const output = await plugin.call('normalize', inputJson);
            const outputJson = output.text();
            return JSON.parse(outputJson) as DialectBuffer;
        } catch (error: any) {
            return {
                status: 'Timeout',
                manufacturer,
                parameters: {},
                raw_input: rawInput,
                rejection_reason: `Execution failed or timed out: ${error.message}`
            };
        }
    }
}
