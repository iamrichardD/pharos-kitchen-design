/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components
 * File: DemoWorkspace.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Main workspace container integrating OmniBar, CanvasStage, and Action Gate.
 * Traceability: Issue #242, ADR-0006, ADR-0066
 * Last Updated: 2026-06-15
 * ======================================================================== */

import React, { useState, useEffect } from 'react';
import { load_registry_wasm, get_ghost_metadata_wasm, type PharosRegistryHandle } from '@pkd/core';
import { useWasm, WasmProvider } from './WasmContext';
import { OmniBar } from './OmniBar';
import { CanvasStage } from './CanvasStage';

// Mock Registry containing 4 highly detailed commercial kitchen items
const mockRegistry = {
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
            "PKD_Voltage": "208V",
            "PKD_Phase": 3,
            "PKD_Wattage": "4500W",
            "PKD_BTU": "0",
            "PKD_WIDTH": 24.0,
            "PKD_DEPTH": 24.0,
            "PKD_HEIGHT": 34.0,
            "PKD_DrainConnection": "2\" NPT"
        },
        "lod_geometry_specs": {
            "100": {
                "type": "PROCEDURAL_BOX",
                "dimensions": { "width": "2.0", "depth": "2.0", "height": "2.83" },
                "description": "LOD 100 Volumetric Placeholder"
            }
        },
        "performance_metadata": {
            "estimated_rfa_size_kb": 34,
            "procedural_lod_enabled": true,
            "ghost_link_active": true
        }
    },
    "PHX-ST-002": {
        "metadata_id": "PHX-ST-002",
        "name": "AccuTemp Countertop Steamer",
        "schema_version": "1.0.0",
        "classification": {
            "omniclass_table_23": "23-33 11 11 11",
            "category": "Specialty Equipment"
        },
        "parameters": {
            "PKD_Manufacturer": "AccuTemp Products",
            "PKD_ModelNumber": "N6120-1",
            "PKD_Voltage": "240V",
            "PKD_Phase": 3,
            "PKD_Wattage": "12000W",
            "PKD_BTU": "0",
            "PKD_WIDTH": 22.0,
            "PKD_DEPTH": 30.0,
            "PKD_HEIGHT": 20.0,
            "PKD_DrainConnection": "1\" NPT"
        },
        "lod_geometry_specs": {
            "100": {
                "type": "PROCEDURAL_BOX",
                "dimensions": { "width": "1.83", "depth": "2.5", "height": "1.67" },
                "description": "LOD 100 Volumetric Placeholder"
            }
        },
        "performance_metadata": {
            "estimated_rfa_size_kb": 28,
            "procedural_lod_enabled": true,
            "ghost_link_active": true
        }
    },
    "PHX-OV-003": {
        "metadata_id": "PHX-OV-003",
        "name": "ACP High Speed Oven",
        "schema_version": "1.0.0",
        "classification": {
            "omniclass_table_23": "23-33 11 11 11",
            "category": "Specialty Equipment"
        },
        "parameters": {
            "PKD_Manufacturer": "ACP, Inc.",
            "PKD_ModelNumber": "MXP22T",
            "PKD_Voltage": "240V",
            "PKD_Phase": 1,
            "PKD_Wattage": "5700W",
            "PKD_BTU": "0",
            "PKD_WIDTH": 25.0,
            "PKD_DEPTH": 26.0,
            "PKD_HEIGHT": 20.0,
            "PKD_DrainConnection": "None"
        },
        "lod_geometry_specs": {
            "100": {
                "type": "PROCEDURAL_BOX",
                "dimensions": { "width": "2.08", "depth": "2.16", "height": "1.67" },
                "description": "LOD 100 Volumetric Placeholder"
            }
        },
        "performance_metadata": {
            "estimated_rfa_size_kb": 42,
            "procedural_lod_enabled": true,
            "ghost_link_active": true
        }
    },
    "PHX-RG-004": {
        "metadata_id": "PHX-RG-004",
        "name": "Vulcan V-Series Range",
        "schema_version": "1.0.0",
        "classification": {
            "omniclass_table_23": "23-33 11 11 11",
            "category": "Specialty Equipment"
        },
        "parameters": {
            "PKD_Manufacturer": "Vulcan",
            "PKD_ModelNumber": "V4B36",
            "PKD_Voltage": "None",
            "PKD_Phase": 0,
            "PKD_Wattage": "0W",
            "PKD_BTU": "120000",
            "PKD_WIDTH": 36.0,
            "PKD_DEPTH": 38.0,
            "PKD_HEIGHT": 36.0,
            "PKD_DrainConnection": "None"
        },
        "lod_geometry_specs": {
            "100": {
                "type": "PROCEDURAL_BOX",
                "dimensions": { "width": "3.0", "depth": "3.16", "height": "3.0" },
                "description": "LOD 100 Volumetric Placeholder"
            }
        },
        "performance_metadata": {
            "estimated_rfa_size_kb": 56,
            "procedural_lod_enabled": true,
            "ghost_link_active": true
        }
    }
};

const DemoWorkspaceContent: React.FC = () => {
    const { status: wasmStatus, error: wasmError } = useWasm();
    
    // Core Registry & Model State
    const [handle, setHandle] = useState<PharosRegistryHandle | null>(null);
    const [selectedModel, setSelectedModel] = useState<any | null>(null);
    const [hoveredModel, setHoveredModel] = useState<any | null>(null);
    
    // Simulation / Connection State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isPluginConnected, setIsPluginConnected] = useState(false);
    
    // UI Feedback & Theme State
    const [statusText, setStatusText] = useState('[SYS] Catalog Online. Ready for design instructions.');
    const [theme, setTheme] = useState('perf-dark');
    const [isMatrixExpanded, setIsMatrixExpanded] = useState(false);

    // Initialize WASM Registry
    useEffect(() => {
        if (wasmStatus !== 'READY') return;
        try {
            const h = load_registry_wasm(mockRegistry);
            setHandle(h);
            // Default select the first item
            const defaultMetadata = get_ghost_metadata_wasm(h, "PHX-DW-001");
            setSelectedModel(defaultMetadata);
        } catch (e: any) {
            console.error("WASM Registry Loading Failed:", e);
            setStatusText(`[ERROR] WASM Registry initialization failure: ${e.toString()}`);
        }
    }, [wasmStatus]);

    // Apply active design matrix class on document body
    useEffect(() => {
        document.body.className = `blueprint-grid theme-${theme}`;
    }, [theme]);

    const handleHoverItem = (itemId: string | null) => {
        if (!handle || !itemId) {
            setHoveredModel(null);
            return;
        }
        try {
            // High-rigor Hover-Bake trigger (UI_HOVER event)
            const metadata = get_ghost_metadata_wasm(handle, itemId);
            setHoveredModel(metadata);
        } catch (e) {
            console.error("Hover-Bake failed:", e);
        }
    };

    const handleSelectItem = (itemId: string) => {
        if (!handle) return;
        try {
            const metadata = get_ghost_metadata_wasm(handle, itemId);
            setSelectedModel(metadata);
        } catch (e) {
            console.error("Selecting item failed:", e);
        }
    };

    // Revit Action Gate Click Handler
    const handleSendToRevit = () => {
        if (!isAuthenticated || !isPluginConnected || !selectedModel) return;
        
        // Signed manifest transmission mock simulation
        const manifest = selectedModel.geometry_manifest;
        console.log("🚀 Sending signed manifest to pkd-bridge:", manifest);
        setStatusText(`[SYS] Signed manifest for ${selectedModel.name} successfully dispatched to pkd-bridge.`);
    };

    // Revit Action Tooltip Logic
    const getRevitTooltip = () => {
        if (!isAuthenticated) {
            return "Requires a Pharos account. Sign up to send models directly to your open Revit project.";
        }
        if (!isPluginConnected) {
            return "Revit plugin not detected. Make sure the Pharos plugin is running in Revit.";
        }
        return "Instantiate this procedural model directly inside your open Revit project.";
    };

    if (wasmStatus === 'LOADING') {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'monospace', color: '#ff6b00' }}>
                [SYS] LOADING PHAROS WASM ENGINE...
            </div>
        );
    }

    if (wasmStatus === 'ERROR') {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'monospace', color: '#ef4444' }}>
                [ERROR] FFI LOAD ERROR: {wasmError || 'Failed to initialize WASM subsystem.'}
            </div>
        );
    }

    const activeModel = hoveredModel || selectedModel;

    return (
        <main 
            style={{ 
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                minHeight: 'calc(100vh - 180px)'
            }}
        >
            {/* OmniBar Area */}
            <div className="blueprint-border" style={{ padding: '1.5rem', borderRadius: '8px', backgroundColor: 'rgba(26,26,26,0.3)' }}>
                <OmniBar 
                    registryHandle={handle}
                    onHoverItem={handleHoverItem}
                    onSelectItem={handleSelectItem}
                    statusText={statusText}
                    setStatusText={setStatusText}
                />
            </div>

            {/* Main Workspace Layout */}
            <div 
                style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr', 
                    gap: '2rem',
                    alignItems: 'stretch'
                }}
            >
                {/* 3D Visualizer Canvas */}
                <div style={{ display: 'flex', position: 'relative' }}>
                    <CanvasStage selectedModel={selectedModel} hoveredModel={hoveredModel} />

                    {/* Matrix Switcher Widget */}
                    <div 
                        style={{ 
                            position: 'absolute',
                            bottom: '20px',
                            right: '20px',
                            zIndex: 30,
                            backgroundColor: '#1a1a1a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: isMatrixExpanded ? '16px' : '0',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
                            width: isMatrixExpanded ? '260px' : '48px',
                            height: isMatrixExpanded ? 'auto' : '48px',
                            overflow: 'hidden',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <button 
                            onClick={() => setIsMatrixExpanded(!isMatrixExpanded)}
                            style={{ 
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ff6b00',
                                position: 'absolute',
                                top: 0,
                                right: 0
                            }}
                        >
                            {isMatrixExpanded ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                </svg>
                            )}
                        </button>

                        {isMatrixExpanded && (
                            <div style={{ pointerEvents: 'auto' }}>
                                <h4 style={{ fontSize: '10px', textTransform: 'uppercase', color: '#84a59d', marginBottom: '8px', fontWeight: 600 }}>Design Matrix</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        { id: 'perf-dark', label: 'Opt-D' },
                                        { id: 'perf-light', label: 'Optimism' },
                                        { id: 'bal-dark', label: 'Bot-D' },
                                        { id: 'bal-light', label: 'Botanical' },
                                        { id: 'moody-dark', label: 'Lux-D' },
                                        { id: 'moody-light', label: 'Luxe' },
                                        { id: 'solar-dark', label: 'Quiet-D' },
                                        { id: 'solar-light', label: 'Solar Lux' },
                                        { id: 'legacy-dark', label: 'Leg-D' },
                                        { id: 'legacy-light', label: 'Legacy' }
                                    ].map(swatch => (
                                        <button 
                                            key={swatch.id}
                                            onClick={() => setTheme(swatch.id)}
                                            style={{
                                                height: '36px',
                                                borderRadius: '4px',
                                                border: theme === swatch.id ? '2px solid #ff6b00' : '2px solid transparent',
                                                cursor: 'pointer',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                color: '#ffffff',
                                                backgroundColor: theme === swatch.id ? 'rgba(255, 107, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {swatch.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Specifications & Action Gate */}
                <div 
                    className="blueprint-border" 
                    style={{ 
                        backgroundColor: '#1a1a1a',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <header style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <h2 style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 4px 0', letterSpacing: '0.1em' }}>Technical Specifications</h2>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: '#f3f4f6' }}>
                            {activeModel ? activeModel.name : 'No Selected Product'}
                        </div>
                    </header>

                    <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {activeModel ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>Manufacturer:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_Manufacturer || 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>Model Number:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_ModelNumber || 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>Dimensions:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_WIDTH}"W x {activeModel.parameters.PKD_DEPTH}"D x {activeModel.parameters.PKD_HEIGHT}"H
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>Voltage:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_Voltage || 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>Phase:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_Phase !== undefined ? `${activeModel.parameters.PKD_Phase} Ph` : 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>Wattage:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_Wattage || 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>BTU / Hr:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_BTU || 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>Drain Connection:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_DrainConnection || 'N/A'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>UUID:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        pkd-{activeModel.metadata_id.toLowerCase()}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Select or search for a product to inspect parameters.</p>
                        )}

                        {/* Send to Revit Action Gate */}
                        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '20px' }}>
                            <button
                                onClick={handleSendToRevit}
                                disabled={!isAuthenticated || !isPluginConnected || !selectedModel}
                                title={getRevitTooltip()}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    backgroundColor: (isAuthenticated && isPluginConnected) ? '#ff6b00' : 'rgba(255, 255, 255, 0.05)',
                                    color: (isAuthenticated && isPluginConnected) ? '#ffffff' : '#9ca3af',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: (isAuthenticated && isPluginConnected) ? 'pointer' : 'not-allowed',
                                    transition: 'background-color 0.2s',
                                    boxShadow: (isAuthenticated && isPluginConnected) ? '0 4px 12px rgba(255, 107, 0, 0.3)' : 'none'
                                }}
                            >
                                Send to Revit
                            </button>

                            {/* Simulation Toggles (Interactive Testing Harness) */}
                            <div 
                                style={{ 
                                    marginTop: '20px',
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#84a59d', marginBottom: '8px' }}>
                                    Action Gate Simulator
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isAuthenticated} 
                                            onChange={(e) => setIsAuthenticated(e.target.checked)} 
                                        />
                                        Simulate Authenticated User
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isPluginConnected} 
                                            onChange={(e) => setIsPluginConnected(e.target.checked)} 
                                        />
                                        Simulate Revit Plugin Connected
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export const DemoWorkspace: React.FC = () => {
    return (
        <WasmProvider>
            <DemoWorkspaceContent />
        </WasmProvider>
    );
};
