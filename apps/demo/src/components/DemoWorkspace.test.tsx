/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components / Tests
 * File: DemoWorkspace.test.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic verification of DemoWorkspace components, layout, and states.
 * Traceability: Issue #242, PR #250
 * Last Updated: 2026-06-15
 * ======================================================================== */

/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { DemoWorkspace } from './DemoWorkspace';
import { resetWasmSingleton } from '../utils/wasmStore';
import { get_ghost_metadata_wasm } from '@pkd/core';

// Mock @pkd/core
vi.mock('@pkd/core', () => ({
    default: vi.fn(() => Promise.resolve()),
    load_registry_wasm: vi.fn(() => ({})),
    get_ghost_metadata_wasm: vi.fn(() => ({
        metadata_id: "PHX-DW-001",
        name: "Hobart LXeR Commercial Dishwasher",
        schema_version: "1.0.0",
        classification: {
            omniclass_table_23: "23-33 11 11 11",
            category: "Specialty Equipment"
        },
        parameters: {
            PKD_Manufacturer: "Hobart",
            PKD_ModelNumber: "LXeR",
            PKD_Voltage: "208V",
            PKD_Phase: 3,
            PKD_Wattage: "4500W",
            PKD_BTU: "0",
            PKD_WIDTH: 24.0,
            PKD_DEPTH: 24.0,
            PKD_HEIGHT: 34.0,
            PKD_DrainConnection: "2\" NPT"
        },
        lod_geometry_specs: {
            "100": {
                type: "PROCEDURAL_BOX",
                dimensions: { width: "2.0", depth: "2.0", height: "2.83" },
                description: "LOD 100 Volumetric Placeholder"
            }
        },
        performance_metadata: {
            estimated_rfa_size_kb: 34,
            procedural_lod_enabled: true,
            ghost_link_active: true
        }
    })),
    sync_state_wasm: vi.fn(),
}));

// Mock ThreeJsInterpreter to avoid WebGL / Canvas errors in happy-dom
vi.mock('./ThreeJsInterpreter', () => ({
    ThreeJsInterpreter: () => <div data-testid="mock-threejs">Mock ThreeJS</div>,
}));

describe('DemoWorkspace', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetWasmSingleton();
    });

    afterEach(() => {
        cleanup();
    });

    it('test_should_render_omnibar_when_wasm_ready', async () => {
        render(<DemoWorkspace />);

        // Wait for WASM status to transition to READY and container to render the custom element
        await waitFor(() => {
            const commandBar = document.querySelector('pkd-command-bar');
            expect(commandBar).not.toBeNull();
        });
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

    it('test_should_render_canvas_placeholder_when_no_model_selected', async () => {
        // Mock get_ghost_metadata_wasm to return null or no geometry manifest for the canvas stage placeholder check
        (get_ghost_metadata_wasm as any).mockReturnValueOnce(null);

        render(<DemoWorkspace />);

        await waitFor(() => {
            expect(
                screen.getByText(/Type \/add to search catalog or hover matches to procedural bake 3D geometry/i)
            ).toBeDefined();
        });
    });
});
