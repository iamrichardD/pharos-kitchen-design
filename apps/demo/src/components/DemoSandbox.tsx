/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components
 * File: DemoSandbox.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified WASM Sandbox container to ensure React context sharing.
 * Traceability: Issue #235
 * Last Updated: 2026-06-10
 * ======================================================================== */

import React from 'react';
import { WasmProvider } from './WasmContext';
import { InteropSandbox } from './InteropSandbox';

export const DemoSandbox: React.FC = () => {
    return (
        <WasmProvider>
            <InteropSandbox />
        </WasmProvider>
    );
};
