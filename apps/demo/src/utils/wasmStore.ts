/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Shared / Stores
 * File: wasmStore.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Framework-agnostic WASM lifecycle management via Nano Stores.
 * Traceability: Issue #137, Audit PR #172
 * ======================================================================== */

import { atom } from 'nanostores';
import init from '@pkd/core';

export type WasmStatus = 'INIT' | 'LOADING' | 'READY' | 'ERROR';

export interface WasmState {
    status: WasmStatus;
    error: string | null;
}

// Why: Nano Stores provide framework-agnostic state (ADR violation fix)
export const $wasmStore = atom<WasmState>({
    status: 'INIT',
    error: null
});

// Singleton Promise: Guarantees a single initialization call regardless of race conditions
let initPromise: Promise<void> | null = null;

/**
 * Initiates the WASM core initialization exactly once.
 * Why: Caching the promise outside React lifecycle ensures true singleton integrity.
 */
export async function initializeWasm() {
    if (initPromise) return initPromise;

    $wasmStore.set({ status: 'LOADING', error: null });

    initPromise = (async () => {
        try {
            await init();
            $wasmStore.set({ status: 'READY', error: null });
            console.log('🟢 Pharos WASM Core Initialized (Nano Store Singleton)');
        } catch (e: any) {
            console.error('🔴 Pharos WASM Initialization Failed:', e);
            $wasmStore.set({ status: 'ERROR', error: e.toString() });
            initPromise = null; // Allow retry on failure
            throw e;
        }
    })();

    return initPromise;
}

/**
 * Resets the singleton state for testing.
 * @internal
 */
export function resetWasmSingleton() {
    initPromise = null;
    $wasmStore.set({ status: 'INIT', error: null });
}
