/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components / Tests
 * File: DemoWorkspace.test.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic verification of DemoWorkspace components, layout, and states.
 * Traceability: Issue #252, Issue #242, PR #250
 * Last Updated: 2026-06-16
 * ======================================================================== */

/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { DemoWorkspace } from './DemoWorkspace';
import { CanvasStage } from './CanvasStage';
import { resetWasmSingleton } from '../utils/wasmStore';
import init from '@pkd/core';
import fs from 'fs';
import path from 'path';
import * as NetworkConnectivity from '../utils/NetworkConnectivity';

// Mock ThreeJsInterpreter to avoid WebGL / Canvas errors in happy-dom
vi.mock('./ThreeJsInterpreter', () => ({
    ThreeJsInterpreter: () => <div data-testid="mock-threejs">Mock ThreeJS</div>,
}));

describe('DemoWorkspace', () => {
    let mockFetch: any;

    beforeAll(async () => {
        // Read the actual compiled WASM binary from the pkd-core package
        const wasmPath = path.resolve(__dirname, '../../../../packages/pkd-core/pkg/pkd_core_bg.wasm');
        const wasmBuffer = fs.readFileSync(wasmPath);
        // Pre-initialize the WASM module using the buffer directly
        await init(wasmBuffer);
    });

    beforeEach(() => {
        resetWasmSingleton();
        
        mockFetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('search-index.bin')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        "PHX-DW-001": {
                            "metadata_id": "PHX-DW-001",
                            "name": "Hobart LXeR Commercial Dishwasher",
                            "schema_version": "1.0.0",
                            "classification": {
                                "omniclass_table_23": "23-33 11 11 11",
                                "category": "Specialty Equipment"
                            },
                            "parameters": {
                                "PKD_Manufacturer": "Hobart",
                                "PKD_ModelNumber": "LXeR",
                                "PKD_Voltage": 208,
                                "PKD_WIDTH": 24.0,
                                "PKD_DEPTH": 24.0,
                                "PKD_HEIGHT": 34.0
                            },
                            "lod_geometry_specs": {
                                "100": {
                                    "type": "PROCEDURAL_BOX",
                                    "description": "LOD 100 Volumetric Placeholder"
                                }
                            },
                            "performance_metadata": {
                                "estimated_rfa_size_kb": 34,
                                "procedural_lod_enabled": true,
                                "ghost_link_active": false
                            }
                        }
                    })
                });
            }
            if (url.includes('shards/refrigeration.bin')) {
                const shardPayload = JSON.stringify({
                    "shard_id": "refrigeration",
                    "v": "1.0.0",
                    "records": {
                        "PHX-REF-001": {
                            "metadata_id": "PHX-REF-001",
                            "name": "Traulsen R-Series Refrigerator",
                            "schema_version": "1.0.0",
                            "classification": {
                                "omniclass_table_23": "23-33 11 11 11",
                                "category": "Refrigeration"
                            },
                            "parameters": {
                                "PKD_Manufacturer": "Traulsen",
                                "PKD_ModelNumber": "R2D2",
                                "PKD_Voltage": 115,
                                "PKD_WIDTH": 30.0,
                                "PKD_DEPTH": 32.0,
                                "PKD_HEIGHT": 83.0
                            },
                            "lod_geometry_specs": {
                                "100": {
                                    "type": "PROCEDURAL_BOX",
                                    "description": "LOD 100 Volumetric Placeholder"
                                }
                            },
                            "performance_metadata": {
                                "estimated_rfa_size_kb": 50,
                                "procedural_lod_enabled": true,
                                "ghost_link_active": false
                            }
                        }
                    }
                });
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve(shardPayload)
                });
            }
            return Promise.resolve({ ok: false, status: 404 });
        });
        global.fetch = mockFetch;
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('test_should_render_omnibar_when_wasm_ready', async () => {
        render(<DemoWorkspace />);

        // Wait for WASM status to transition to READY and container to render the custom element
        await waitFor(() => {
            const commandBar = document.querySelector('pkd-command-bar');
            expect(commandBar).not.toBeNull();
        });
    });

    it('test_should_fetch_search_index_from_cdn_when_mounted', async () => {
        render(<DemoWorkspace />);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('search-index.bin')
            );
        });
    });

    it('test_should_initialize_empty_registry_and_not_fallback_to_mock_registry_when_cdn_fetch_fails', async () => {
        // Force fetch to reject/fail
        mockFetch.mockRejectedValueOnce(new Error('CDN down'));

        render(<DemoWorkspace />);

        // Verify status text doesn't show local mock fallback message
        await waitFor(() => {
            expect(screen.queryByText(/Using local mock registry fallback/i)).toBeNull();
        });
    });

    it('test_should_display_offline_mode_indicator_when_browser_is_offline', async () => {
        const spy = vi.spyOn(NetworkConnectivity, 'useConnectivity').mockReturnValue({ isOnline: false, triggerCheck: vi.fn() });
        render(<DemoWorkspace />);

        await waitFor(() => {
            const indicator = screen.getByTestId('offline-mode-indicator');
            expect(indicator).toBeDefined();
            expect(indicator.textContent).toContain('Offline Mode Active');
        });
        spy.mockRestore();
    });

    it('test_should_not_display_offline_mode_indicator_when_browser_is_online', async () => {
        const spy = vi.spyOn(NetworkConnectivity, 'useConnectivity').mockReturnValue({ isOnline: true, triggerCheck: vi.fn() });
        render(<DemoWorkspace />);

        await waitFor(() => {
            expect(screen.queryByTestId('offline-mode-indicator')).toBeNull();
        });
        spy.mockRestore();
    });

    it('test_should_display_offline_warning_when_offline_query_returns_zero_matches', async () => {
        const spy = vi.spyOn(NetworkConnectivity, 'useConnectivity').mockReturnValue({ isOnline: false, triggerCheck: vi.fn() });
        render(<DemoWorkspace />);

        await waitFor(() => {
            const commandBar = document.querySelector('pkd-command-bar');
            expect(commandBar).not.toBeNull();
        });

        const commandBar = document.querySelector('pkd-command-bar');
        commandBar?.dispatchEvent(new CustomEvent('pkd-query', { detail: { value: 'nonexistent' } }));

        await waitFor(() => {
            const warningText = screen.getByText(/Offline, and search results may be limited/i);
            expect(warningText).toBeDefined();
        });
        spy.mockRestore();
    });

    it('test_should_display_disabled_send_button_when_guest', async () => {
        render(<DemoWorkspace />);

        await waitFor(() => {
            const sendButton = screen.getByRole('button', { name: /Send to Revit/i });
            expect(sendButton).toBeDefined();
            expect(sendButton.getAttribute('disabled')).not.toBeNull();
            expect(sendButton.getAttribute('title')).toBe(
                "Requires a Pharos account. Sign up to send models directly to your open Revit project."
            );
        });
    });

    it('test_should_lazy_load_category_shard_when_query_contains_category', async () => {
        render(<DemoWorkspace />);

        await waitFor(() => {
            const commandBar = document.querySelector('pkd-command-bar');
            expect(commandBar).not.toBeNull();
        });

        const commandBar = document.querySelector('pkd-command-bar');
        commandBar?.dispatchEvent(new CustomEvent('pkd-query', { detail: { value: 'category=refrigeration' } }));

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('shards/refrigeration.bin'),
                expect.any(Object)
            );
        });
    });

    it('test_should_trigger_connectivity_check_when_retry_clicked', async () => {
        const triggerCheckMock = vi.fn();
        const spy = vi.spyOn(NetworkConnectivity, 'useConnectivity').mockReturnValue({
            isOnline: false,
            triggerCheck: triggerCheckMock
        });

        render(<DemoWorkspace />);

        await waitFor(() => {
            const btn = screen.getByRole('button', { name: /Retry Connection/i });
            expect(btn).toBeDefined();
            btn.click();
        });

        expect(triggerCheckMock).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('test_should_render_canvas_placeholder_when_no_model_selected', () => {
        render(<CanvasStage selectedModel={null} hoveredModel={null} />);

        expect(
            screen.getByText(/Use the search bar above and select a product to view its model./i)
        ).toBeDefined();
    });
});
