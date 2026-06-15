/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Components
 * File: CanvasStage.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Renders procedural geometry manifest using Three.js visualization.
 * Traceability: Issue #242, ADR-0066
 * Last Updated: 2026-06-15
 * ======================================================================== */

import React from 'react';
import { ThreeJsInterpreter } from './ThreeJsInterpreter';

interface CanvasStageProps {
    selectedModel: any | null;
    hoveredModel: any | null;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({ selectedModel, hoveredModel }) => {
    const activeModel = hoveredModel || selectedModel;

    return (
        <div 
            style={{ 
                flexGrow: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                minHeight: '400px',
                border: '1px solid rgba(0, 95, 184, 0.3)',
                borderRadius: '8px',
                backgroundColor: '#050505'
            }}
        >
            {/* Legend Overlay */}
            <div 
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    textAlign: 'right',
                    color: '#84a59d',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    opacity: 0.7,
                    pointerEvents: 'none',
                    zIndex: 20
                }}
            >
                <b style={{ color: '#ff6b00' }}>[/]</b> COMMAND &nbsp; 
                <b style={{ color: '#ff6b00' }}>[ENTER]</b> PLACE &nbsp; 
                <b style={{ color: '#ff6b00' }}>[ESC]</b> CLEAR &nbsp; 
                <b style={{ color: '#ff6b00' }}>[?]</b> HELP
            </div>

            {/* Active Model Name Overlay */}
            {activeModel && (
                <div 
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        zIndex: 20,
                        backgroundColor: 'rgba(26, 26, 26, 0.8)',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{ fontSize: '11px', color: '#ff6b00', fontWeight: 'bold' }}>
                        {hoveredModel ? 'PREVIEW (HOVER)' : 'ACTIVE SELECTION'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: 600 }}>
                        {activeModel.name}
                    </div>
                </div>
            )}

            {activeModel?.geometry_manifest ? (
                <ThreeJsInterpreter manifest={activeModel.geometry_manifest} height="100%" />
            ) : (
                <div 
                    style={{ 
                        color: '#9ca3af',
                        fontFamily: 'monospace',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '2rem',
                        zIndex: 10
                    }}
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    <div>
                        {activeModel 
                            ? 'No geometry manifest found for this model'
                            : 'Type /add to search catalog or hover matches to procedural bake 3D geometry'}
                    </div>
                </div>
            )}
        </div>
    );
};
