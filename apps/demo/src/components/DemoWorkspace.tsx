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
import mockRegistry from '../__fixtures__/mockRegistry.json';

export interface PharosMetadata {
    metadata_id: string;
    name: string;
    schema_version: string;
    classification: {
        omniclass_table_23: string;
        category: string;
    };
    parameters: Record<string, any>;
    lod_geometry_specs: Record<string, {
        type: string;
        dimensions: Record<string, string>;
        description: string;
    }>;
    geometry_manifest?: any;
    performance_metadata: {
        estimated_rfa_size_kb: number;
        procedural_lod_enabled: boolean;
        ghost_link_active: boolean;
    };
}

const DemoWorkspaceContent: React.FC = () => {
    const { status: wasmStatus, error: wasmError } = useWasm();
    
    // Core Registry & Model State
    const [handle, setHandle] = useState<PharosRegistryHandle | null>(null);
    const [selectedModel, setSelectedModel] = useState<PharosMetadata | null>(null);
    const [hoveredModel, setHoveredModel] = useState<PharosMetadata | null>(null);
    
    // Simulation / Connection State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isPluginConnected, setIsPluginConnected] = useState(false);
    
    // UI Feedback & Theme State
    const [statusText, setStatusText] = useState(
        typeof navigator !== 'undefined' && !navigator.onLine
            ? '[SYS] Catalog Offline. Registry unavailable.'
            : ''
    );
    const theme = 'perf-dark';

    // Handle catalog availability due to airplane mode / network state
    useEffect(() => {
        const handleOnline = () => setStatusText('');
        const handleOffline = () => setStatusText('[SYS] Catalog Offline. Registry unavailable.');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Initialize WASM Registry
    useEffect(() => {
        if (wasmStatus !== 'READY') return;
        try {
            const h = load_registry_wasm(mockRegistry);
            setHandle(h);
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
                <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
                    <CanvasStage selectedModel={selectedModel} hoveredModel={hoveredModel} />
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
                                        {activeModel.parameters.PKD_Voltage ? `${activeModel.parameters.PKD_Voltage}V` : 'None'}
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
                                        {activeModel.parameters.PKD_Wattage ? `${activeModel.parameters.PKD_Wattage}W` : 'None'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#9ca3af' }}>BTU / Hr:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#ff6b00' }}>
                                        {activeModel.parameters.PKD_BTU !== undefined ? activeModel.parameters.PKD_BTU : 'N/A'}
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
                            <details 
                                style={{ 
                                    marginTop: '20px',
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer'
                                }}
                            >
                                <summary style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#84a59d', outline: 'none' }}>
                                    Developer Diagnostics
                                </summary>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', fontWeight: 'bold', marginBottom: '4px' }}>
                                        Action Gate Simulator
                                    </div>
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
                            </details>
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
