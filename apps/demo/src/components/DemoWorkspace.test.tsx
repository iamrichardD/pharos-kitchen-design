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

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { DemoWorkspace } from './DemoWorkspace';
import { CanvasStage } from './CanvasStage';
import { resetWasmSingleton } from '../utils/wasmStore';
import init from '@pkd/core';
import fs from 'fs';
import path from 'path';

// Mock ThreeJsInterpreter to avoid WebGL / Canvas errors in happy-dom
vi.mock('./ThreeJsInterpreter', () => ({
    ThreeJsInterpreter: () => <div data-testid="mock-threejs">Mock ThreeJS</div>,
}));

describe('DemoWorkspace', () => {
    beforeAll(async () => {
        // Read the actual compiled WASM binary from the pkd-core package
        const wasmPath = path.resolve(__dirname, '../../../../packages/pkd-core/pkg/pkd_core_bg.wasm');
        const wasmBuffer = fs.readFileSync(wasmPath);
        // Pre-initialize the WASM module using the buffer directly
        await init(wasmBuffer);
    });

    beforeEach(() => {
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

    it('test_should_render_canvas_placeholder_when_no_model_selected', () => {
        render(<CanvasStage selectedModel={null} hoveredModel={null} />);

        expect(
            screen.getByText(/Use the search bar above and select a product to view its model./i)
        ).toBeDefined();
    });
});
