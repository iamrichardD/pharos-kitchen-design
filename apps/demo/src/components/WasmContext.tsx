/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Shared / Context
 * File: WasmContext.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Shared React context for managing WASM lifecycle and state.
 * Traceability: Issue #137
 * ======================================================================== */

import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $wasmStore, initializeWasm, type WasmStatus } from '../utils/wasmStore';

interface WasmContextState {
    status: WasmStatus;
    error: string | null;
}

const WasmContext = createContext<WasmContextState | undefined>(undefined);

export const WasmProvider = ({ children }: { children: ReactNode }) => {
    const wasmState = useStore($wasmStore);

    useEffect(() => {
        // Why: Singleton initialization avoids race conditions and multiple loads
        initializeWasm().catch(() => {
            // Error is handled in the store
        });
    }, []);

    return (
        <WasmContext.Provider value={wasmState}>
            {children}
        </WasmContext.Provider>
    );
};

export const useWasm = () => {
    const context = useContext(WasmContext);
    if (context === undefined) {
        throw new Error('useWasm must be used within a WasmProvider');
    }
    return context;
};
