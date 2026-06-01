/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Web / Components
 * File: apps/marketing/src/components/ThreeJsInterpreter.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Renders procedural GeometryManifest payloads using Three.js.
 * Traceability: Issue #122
 * ======================================================================== */

import React, { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Bounds, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { 
    type GeometryManifest, 
    type GeometryOperation, 
    GeometryManifestSchema 
} from '@pkd/protocol';
import { CoordinateTransformer } from '../utils/CoordinateTransformer';

interface Props {
    manifest: GeometryManifest;
    height?: string;
}

const MaterialMap: Record<string, THREE.MeshStandardMaterialParameters> = {
    'Stainless_Steel': { color: '#a0a0a0', metalness: 0.9, roughness: 0.1 },
    'Galvanized': { color: '#888888', metalness: 0.5, roughness: 0.4 },
    'Default': { color: '#cccccc', metalness: 0.2, roughness: 0.8 }
};

const OperationMesh: React.FC<{ op: GeometryOperation }> = ({ op }) => {
    const { width, depth, height } = op.dimensions;
    
    const materialParams = useMemo(() => 
        MaterialMap[op.material_class || 'Default'] || MaterialMap['Default'], 
    [op.material_class]);

    const position = useMemo(() => 
        CoordinateTransformer.calculateThreeCenter(op.origin, op.dimensions),
    [op.origin, op.dimensions]);

    return (
        <mesh 
            castShadow 
            receiveShadow 
            position={position}
        >
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial {...(materialParams as any)} />
            <Edges 
                scale={1.0}
                threshold={15}
                color="#ffffff" 
            />
        </mesh>
    );
};

export const ThreeJsInterpreter: React.FC<Props> = ({ manifest, height = '400px' }) => {
    // 🛡️ Schema Validation (The Zod Guard)
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

            <Canvas shadows camera={{ position: [50, 50, 50], fov: 45 }}>
                <Suspense fallback={null}>
                    <Stage 
                        intensity={0.5} 
                        environment="city" 
                        adjustCamera={false}
                        shadows={{ type: 'contact', opacity: 0.5, blur: 3 }}
                    >
                        <Bounds fit observe margin={1.2}>
                            <group>
                                {validatedManifest.operations.map((op: GeometryOperation) => (
                                    <OperationMesh key={op.id} op={op} />
                                ))}
                            </group>
                        </Bounds>
                    </Stage>
                    <OrbitControls makeDefault />
                </Suspense>
            </Canvas>
        </div>
    );
};
