/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Shared / Context / Tests
 * File: WasmContext.test.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic verification of WasmProvider lifecycle and state.
 * Traceability: Issue #137
 * ======================================================================== */

/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { WasmProvider, useWasm } from './WasmContext';
import { resetWasmSingleton } from '../utils/wasmStore';
import init from '@pkd/core';

// Mock @pkd/core
vi.mock('@pkd/core', () => ({
    default: vi.fn(() => Promise.resolve()),
    load_registry_wasm: vi.fn(),
    get_ghost_metadata_wasm: vi.fn(),
    sync_state_wasm: vi.fn(),
}));

const TestComponent = () => {
    const { status, error } = useWasm();
    return (
        <div>
            <span data-testid="wasm-status">{status}</span>
            {error && <span data-testid="wasm-error">{error}</span>}
        </div>
    );
};

describe('WasmContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetWasmSingleton();
    });

    afterEach(() => {
        cleanup();
    });

    it('test_should_initialize_to_loading_then_ready_when_mounted', async () => {
        render(
            <WasmProvider>
                <TestComponent />
            </WasmProvider>
        );

        expect(screen.getByTestId('wasm-status').textContent).toBe('LOADING');
        
        await waitFor(() => {
            expect(screen.getByTestId('wasm-status').textContent).toBe('READY');
        });
        
        expect(init).toHaveBeenCalledTimes(1);
    });

    it('test_should_handle_initialization_failure_when_init_throws', async () => {
        (init as any).mockRejectedValueOnce(new Error('WASM_LOAD_FAILURE'));

        render(
            <WasmProvider>
                <TestComponent />
            </WasmProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('wasm-status').textContent).toBe('ERROR');
            expect(screen.getByTestId('wasm-error').textContent).toContain('WASM_LOAD_FAILURE');
        });
    });

    it('test_should_throw_error_when_used_outside_provider', () => {
        // Prevent vitest from failing the test due to expected throw
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        expect(() => render(<TestComponent />)).toThrow('useWasm must be used within a WasmProvider');
        
        spy.mockRestore();
    });
});
