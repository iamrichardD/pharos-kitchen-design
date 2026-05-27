/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Shared / Context
 * File: WasmContext.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Shared React context for managing WASM lifecycle and state.
 * Traceability: Issue #137
 * ======================================================================== */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import init from '@pkd/core';


export type WasmStatus = 'INIT' | 'LOADING' | 'READY' | 'ERROR';

interface WasmContextState {
    status: WasmStatus;
    error: string | null;
}

const WasmContext = createContext<WasmContextState | undefined>(undefined);

export const WasmProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<WasmStatus>('INIT');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function initialize() {
            if (status !== 'INIT') return;
            
            setStatus('LOADING');
            try {
                // Why: Consolidates WASM initialization to a single provider
                // to reduce network overhead and memory footprint.
                await init();
                
                if (mounted) {
                    setStatus('READY');
                    console.log('🟢 Pharos WASM Core Initialized (Shared Context)');
                }
            } catch (e: any) {
                console.error('🔴 Pharos WASM Initialization Failed:', e);
                if (mounted) {
                    setError(e.toString());
                    setStatus('ERROR');
                }
            }
        }

        initialize();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <WasmContext.Provider value={{ status, error }}>
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
