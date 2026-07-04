/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Web / Components
 * File: apps/marketing/src/components/ThreeJsInterpreter.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Renders procedural GeometryManifest payloads using Three.js.
 * Traceability: Issue #122
 * ======================================================================== */

import React, { useMemo, Suspense, lazy } from 'react';
import { 
    type GeometryManifest, 
    GeometryManifestSchema 
} from '@pkd/protocol';

const ThreeCanvas = lazy(() => import('./ThreeCanvas'));

interface Props {
    manifest: GeometryManifest;
    height?: string;
}

const LoadingFallback = () => (
    <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#3b82f6',
        fontFamily: 'monospace',
        fontSize: '11px',
        background: '#050505',
        letterSpacing: '0.1em'
    }}>
        <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(59, 130, 246, 0.2)',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '12px'
        }} />
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}} />
        LOADING ENGINE...
    </div>
);

export const ThreeJsInterpreter: React.FC<Props> = ({ manifest, height = '400px' }) => {
    // 🛡️ Schema Validation (The Zod Guard) - Runs synchronously before loading components
    const validationResult = useMemo(() => {
        return GeometryManifestSchema.safeParse(manifest);
    }, [manifest]);

    if (!validationResult.success) {
        console.error("Pharos Geometry Validation Failure:", validationResult.error);
        return (
            <div style={{ 
                width: '100%', 
                height, 
                background: '#0a0a0a', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#ef4444',
                fontFamily: 'monospace',
                border: '1px solid #ef444433',
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚠️</div>
                <div style={{ fontWeight: 'bold' }}>[ INVALID_GEOMETRY_MANIFEST ]</div>
                <div style={{ fontSize: '10px', marginTop: '0.5rem', opacity: 0.7 }}>
                    {validationResult.error.errors[0]?.message} at {validationResult.error.errors[0]?.path.join('.')}
                </div>
            </div>
        );
    }

    const validatedManifest = validationResult.data;

    return (
        <div style={{ 
            width: '100%', 
            height, 
            background: '#050505', 
            borderRadius: '8px', 
            overflow: 'hidden',
            border: '1px solid #1e1e1e',
            position: 'relative'
        }}>
            <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                <div style={{ 
                    background: 'rgba(0,0,0,0.6)', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    borderLeft: '2px solid #3b82f6',
                    fontSize: '10px',
                    color: '#3b82f6',
                    textTransform: 'uppercase',
                    fontWeight: 'bold',
                    letterSpacing: '0.1em'
                }}>
                    LOD {validatedManifest.lod} Visualizer
                </div>
            </div>

            <Suspense fallback={<LoadingFallback />}>
                <ThreeCanvas manifest={validatedManifest} />
            </Suspense>
        </div>
    );
};

