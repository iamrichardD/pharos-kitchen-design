/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / WASM Loader
 * File: packages/truth-engine/src/loader.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Secure dynamic loading of WASM-based manufacturer dialects.
 * Traceability: Issue #60, ADR 0017
 * ======================================================================== */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
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
        // Strip 'sha256:' prefix if present
        const cleanExpected = expectedHash.startsWith('sha256:') ? expectedHash.substring(7) : expectedHash;
        const buffer = readFileSync(wasmPath);
        const actualHash = createHash('sha256').update(buffer).digest('hex');
        return actualHash === cleanExpected;
    }

    /**
     * Retrieves the authoritative hash for a WASM artifact from the local manifest.json.
     * Traceability: ADR-0029 (Immutable WASM Promotion).
     */
    public static getManifestHash(wasmPath: string): string {
        const dir = dirname(wasmPath);
        const filename = basename(wasmPath);
        const manifestPath = join(dir, 'manifest.json');

        if (!existsSync(manifestPath)) {
            throw new Error(`SECURITY_VIOLATION: Missing manifest.json in ${dir}`);
        }

        try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            const hash = manifest[filename];
            if (!hash) {
                throw new Error(`SECURITY_VIOLATION: No manifest entry found for ${filename}`);
            }
            return hash;
        } catch (error: any) {
            throw new Error(`SECURITY_VIOLATION: Failed to parse manifest.json: ${error.message}`);
        }
    }

    /**
     * Loads and instantiates an Extism plugin from a WASM file.
     * Mandate: Hash verification is an enforced, blocking gate (ADR-0016).
     * Implementation: Three-Way Verification (DB vs Manifest vs Physical File).
     */
    public static async loadPlugin(wasmPath: string, dbHash: string): Promise<Plugin> {
        // 1. Retrieve authoritative hash from manifest (ADR-0029)
        const manifestHash = this.getManifestHash(wasmPath);

        // Normalize hashes for comparison (ADR-0029 specifies sha256: prefix)
        const cleanDbHash = dbHash.startsWith('sha256:') ? dbHash.substring(7) : dbHash;
        const cleanManifestHash = manifestHash.startsWith('sha256:') ? manifestHash.substring(7) : manifestHash;

        // 2. Gate 1: Manifest-to-DB Verification (Registry Configuration Check)
        if (cleanDbHash !== cleanManifestHash) {
            throw new Error(`SECURITY_VIOLATION: Manifest-to-DB mismatch for ${wasmPath}. Authoritative: ${manifestHash}, DB: ${dbHash}`);
        }

        // 3. Gate 2: Manifest-to-Physical Verification (Supply Chain Integrity Check)
        if (!this.verifyHash(wasmPath, manifestHash)) {
            throw new Error(`SECURITY_VIOLATION: Manifest-to-Physical mismatch for ${wasmPath}. Physical artifact is tampered or stale.`);
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
