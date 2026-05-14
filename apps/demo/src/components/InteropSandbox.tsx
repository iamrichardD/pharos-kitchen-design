/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components
 * File: InteropSandbox.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Interactive WASM-powered metadata verification sandbox.
 * Traceability: Issue #120
 * ======================================================================== */

import React, { useState, useEffect } from 'react';
import init, { load_registry_wasm, get_ghost_metadata_wasm } from '@pkd/core';

export const InteropSandbox: React.FC = () => {
    const [status, setStatus] = useState('Initializing WASM Core...');
    const [metadata, setMetadata] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function setup() {
            try {
                // Initialize WASM binary (Mandatory for --target web)
                await init();

                // Hybrid Handle Demo Registry (Issue #120)
                const mockRegistry = {
                    "PHX-DW-001": {
                        "metadata_id": "PHX-DW-001",
                        "name": "Hobart LXeR Dishwasher (WASM Demo)",
                        "schema_version": "1.0.0",
                        "classification": {
                            "omniclass_table_23": "23-75 50 11 11",
                            "category": "Warewashing"
                        },
                        "parameters": {
                            "manufacturer": "Hobart",
                            "model": "LXeR",
                            "voltage": "208V",
                            "phase": 1.0
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

                // WASM Handshake (Issue #120)
                const handle = load_registry_wasm(mockRegistry);
                const data = get_ghost_metadata_wasm(handle, "PHX-DW-001");
                
                setMetadata(data);
                setStatus('PHAROS CORE READY [HYBRID HANDLE ACTIVE]');
            } catch (e: any) {
                console.error("Pharos WASM Error:", e);
                setError(e.toString());
                setStatus('FFI_LOAD_ERROR');
            }
        }
        setup();
    }, []);

    return (
        <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            border: '1px solid var(--ph-blue)', 
            background: 'rgba(0, 112, 243, 0.05)', 
            width: '100%', 
            maxWidth: '800px',
            fontFamily: 'sans-serif'
        }}>
            <h3 style={{ color: 'var(--ph-blue)', marginTop: 0, fontSize: '1.2rem' }}>
                {status}
            </h3>
            
            {error && (
                <div style={{ color: '#ff4d4f', background: 'rgba(255, 77, 79, 0.1)', padding: '1rem', borderRadius: '4px' }}>
                    <strong>Verification Error:</strong> {error}
                </div>
            )}
            
            {metadata && (
                <div style={{ marginTop: '1.5rem', textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid #ddd' }}>Identity</h4>
                        <p><strong>ID:</strong> {metadata.metadata_id}</p>
                        <p><strong>Name:</strong> {metadata.name}</p>
                        <p><strong>Category:</strong> {metadata.classification.category}</p>
                        
                        <h4 style={{ margin: '1rem 0 0.5rem 0', borderBottom: '1px solid #ddd' }}>Attributes</h4>
                        <p><strong>Manufacturer:</strong> {metadata.parameters.manufacturer}</p>
                        <p><strong>Model:</strong> {metadata.parameters.model}</p>
                    </div>
                    
                    <div>
                        <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid #ddd' }}>Geometry (LOD 100)</h4>
                        <p><strong>Type:</strong> {metadata.lod_geometry_specs["100"].type}</p>
                        <p><strong>Width:</strong> {metadata.lod_geometry_specs["100"].dimensions.width}m</p>
                        <p><strong>Depth:</strong> {metadata.lod_geometry_specs["100"].dimensions.depth}m</p>
                        <p><strong>Height:</strong> {metadata.lod_geometry_specs["100"].dimensions.height}m</p>
                        
                        <h4 style={{ margin: '1rem 0 0.5rem 0', borderBottom: '1px solid #ddd' }}>Performance</h4>
                        <p><strong>Ghost Link:</strong> {metadata.performance_metadata.ghost_link_active ? 'ACTIVE' : 'INACTIVE'}</p>
                    </div>

                    <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Raw Verifiable Metadata (JSON)</h4>
                        <pre style={{ 
                            background: '#1e1e1e', 
                            color: '#d4d4d4', 
                            padding: '1rem', 
                            fontSize: '0.85rem', 
                            overflowX: 'auto',
                            borderRadius: '4px',
                            maxHeight: '300px'
                        }}>
                            {JSON.stringify(metadata, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
