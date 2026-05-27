/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components
 * File: InteropSandbox.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Interactive WASM-powered metadata verification sandbox with tuning.
 * Traceability: Issue #120, #125, Shard #125.3
 * ======================================================================== */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { load_registry_wasm, get_ghost_metadata_wasm, sync_state_wasm, type PharosRegistryHandle } from '@pkd/core';
import { ThreeJsInterpreter } from './ThreeJsInterpreter';
import { useWasm } from './WasmContext';

export const InteropSandbox: React.FC = () => {
    const { status: wasmStatus, error: wasmError } = useWasm();
    const [status, setStatus] = useState('Initializing WASM Core...');
    const [metadata, setMetadata] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [handle, setHandle] = useState<PharosRegistryHandle | null>(null);
    
    // Tuning State
    const [dimensions, setDimensions] = useState({
        width: 24.0,
        depth: 24.0,
        height: 34.0
    });

    useEffect(() => {
        if (wasmStatus === 'ERROR') {
            setError(wasmError || 'Unknown WASM Initialization Error');
            setStatus('FFI_LOAD_ERROR');
            return;
        }

        if (wasmStatus !== 'READY') return;

        async function setup() {
            if (handle) return; // Already setup

            try {
                // Hybrid Handle Demo Registry (Issue #120, #125)
                const mockRegistry = {
                    "PHX-DW-001": {
                        "metadata_id": "PHX-DW-001",
                        "name": "Hobart LXeR Dishwasher (Tuning Demo)",
                        "schema_version": "1.0.0",
                        "classification": {
                            "omniclass_table_23": "23-75 50 11 11",
                            "category": "Warewashing"
                        },
                        "parameters": {
                            "manufacturer": "Hobart",
                            "model": "LXeR",
                            "PKD_WIDTH": 24.0,
                            "PKD_DEPTH": 24.0,
                            "PKD_HEIGHT": 34.0
                        },
                        "lod_geometry_specs": {
                            "100": {
                                "type": "PROCEDURAL_BOX",
                                "dimensions": {
                                    "width": "2.5",
                                    "depth": "2.5",
                                    "height": "3.5"
                                },
                                "description": "LOD 100 Volumetric Placeholder"
                            }
                        },
                        "performance_metadata": {
                            "estimated_rfa_size_kb": 450,
                            "procedural_lod_enabled": true,
                            "ghost_link_active": true
                        }
                    }
                };

                const h = load_registry_wasm(mockRegistry);
                setHandle(h);
                
                const data = get_ghost_metadata_wasm(h, "PHX-DW-001");
                setMetadata(data);
                setStatus('PHAROS CORE READY [HYBRID HANDLE ACTIVE]');
            } catch (e: any) {
                console.error("Pharos WASM Error:", e);
                setError(e.toString());
                setStatus('FFI_LOAD_ERROR');
            }
        }
        setup();
    }, [wasmStatus, wasmError, handle]);

    // High-Rigor Dispatch: Debounced WASM Sync
    // Why: Prevents event-loop saturation during slider movement while ensuring 
    // the WASM core remains the authoritative source of truth.
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const dispatchSync = useCallback((newDims: typeof dimensions) => {
        if (!handle) return;

        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
            try {
                const updated = sync_state_wasm(handle, "PHX-DW-001", {
                    "PKD_WIDTH": newDims.width,
                    "PKD_DEPTH": newDims.depth,
                    "PKD_HEIGHT": newDims.height
                });
                setMetadata(updated);
            } catch (e: any) {
                setError(`Sync Error: ${e}`);
            }
        }, 50); // 50ms Debounce for smooth interaction
    }, [handle]);

    const handleSliderChange = (key: keyof typeof dimensions, value: number) => {
        const nextDims = { ...dimensions, [key]: value };
        setDimensions(nextDims);
        dispatchSync(nextDims);
    };

    return (
        <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            border: '1px solid #0070f3', 
            background: 'rgba(0, 112, 243, 0.05)', 
            width: '100%', 
            maxWidth: '1000px',
            fontFamily: 'sans-serif',
            borderRadius: '8px',
            color: '#333'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#0070f3', margin: 0, fontSize: '1.2rem' }}>
                    {status}
                </h3>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, fontFamily: 'monospace' }}>
                    Issue #125.3: Ghost Tuning
                </div>
            </div>
            
            {error && (
                <div style={{ color: '#ff4d4f', background: 'rgba(255, 77, 79, 0.1)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                    <strong>Verification Error:</strong> {error}
                </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column: Controls & Info */}
                <div>
                    <div style={{ marginBottom: '2rem', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                            Tuning Sliders
                        </h4>
                        
                        {(['width', 'depth', 'height'] as const).map(dim => (
                            <div key={dim} style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <label style={{ textTransform: 'capitalize', fontWeight: 'bold', fontSize: '0.9rem' }}>{dim}</label>
                                    <span style={{ fontFamily: 'monospace', color: '#0070f3' }}>{dimensions[dim].toFixed(2)}"</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="12" 
                                    max="72" 
                                    step="0.5"
                                    value={dimensions[dim]} 
                                    onChange={(e) => handleSliderChange(dim, parseFloat(e.target.value))}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                        ))}
                    </div>

                    {metadata && (
                        <div style={{ textAlign: 'left' }}>
                            <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid #ddd' }}>Identity</h4>
                            <p style={{ margin: '0.25rem 0' }}><strong>ID:</strong> {metadata.metadata_id}</p>
                            <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {metadata.name}</p>
                            
                            <h4 style={{ margin: '1rem 0 0.5rem 0', borderBottom: '1px solid #ddd' }}>Current State (WASM-Synced)</h4>
                            <p style={{ margin: '0.25rem 0' }}><strong>W:</strong> {metadata.parameters.PKD_WIDTH}"</p>
                            <p style={{ margin: '0.25rem 0' }}><strong>D:</strong> {metadata.parameters.PKD_DEPTH}"</p>
                            <p style={{ margin: '0.25rem 0' }}><strong>H:</strong> {metadata.parameters.PKD_HEIGHT}"</p>
                        </div>
                    )}
                </div>

                {/* Right Column: 3D Preview */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Authoritative 3D Preview</h4>
                    {metadata?.geometry_manifest ? (
                        <ThreeJsInterpreter manifest={metadata.geometry_manifest} height="400px" />
                    ) : (
                        <div style={{ 
                            height: '400px', 
                            background: '#000', 
                            borderRadius: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#666'
                        }}>
                            Waiting for WASM Geometry...
                        </div>
                    )}
                    
                    <div style={{ marginTop: '1rem' }}>
                        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Bake Protocol</h4>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, lineHeight: '1.4' }}>
                            Changes are dispatched to the resident Rust core. The <code>ProceduralGenerator</code> re-bakes the <code>GeometryManifest</code>, which is then re-rendered by Three.js.
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Raw Data */}
                {metadata && (
                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Raw Verifiable Metadata (JSON)</h4>
                        <pre style={{ 
                            background: '#1e1e1e', 
                            color: '#d4d4d4', 
                            padding: '1rem', 
                            fontSize: '0.85rem', 
                            overflowX: 'auto',
                            borderRadius: '4px',
                            maxHeight: '200px'
                        }}>
                            {JSON.stringify(metadata, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
