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
import { OrbitControls, Stage, Bounds, Edges, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';

export interface GeometryOperation {
    id: string;
    type: 'Extrusion';
    profile: 'Rectangle';
    dimensions: {
        width: number;
        depth: number;
        height: number;
    };
    origin: [number, number, number];
    material_class?: string;
}

export interface GeometryManifest {
    lod: number;
    operations: GeometryOperation[];
}

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
    const [x, y, z] = op.origin;

    const materialParams = useMemo(() => 
        MaterialMap[op.material_class || 'Default'] || MaterialMap['Default'], 
    [op.material_class]);

    return (
        <mesh 
            castShadow 
            receiveShadow 
            position={[
                x + width / 2, 
                z + height / 2, 
                y + depth / 2
            ]}
        >
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial {...materialParams} />
            <Edges 
                scale={1.0}
                threshold={15} // Only show edges for angles > 15 degrees
                color="#ffffff" 
            />
        </mesh>
    );
};

export const ThreeJsInterpreter: React.FC<Props> = ({ manifest, height = '400px' }) => {
    if (!manifest || !manifest.operations) {
        return (
            <div style={{ 
                width: '100%', 
                height, 
                background: '#0a0a0a', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#ef4444',
                fontFamily: 'monospace',
                border: '1px solid #ef444433',
                borderRadius: '8px'
            }}>
                [ INVALID_GEOMETRY_MANIFEST ]
            </div>
        );
    }

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
                    LOD {manifest.lod} Visualizer
                </div>
            </div>

            <Canvas shadows camera={{ position: [width_center(manifest) * 2, height_center(manifest) * 2, depth_center(manifest) * 2], fov: 45 }}>
                <Suspense fallback={null}>
                    <Stage 
                        intensity={0.5} 
                        environment="city" 
                        adjustCamera={false}
                        shadows={{ type: 'contact', opacity: 0.5, blur: 3 }}
                    >
                        <Bounds fit observe margin={1.2}>
                            <group>
                                {manifest.operations.map(op => (
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

// Helper functions for initial camera placement if Bounds hasn't kicked in
function width_center(manifest: GeometryManifest) {
    if (!manifest.operations.length) return 0;
    return manifest.operations[0].dimensions.width / 2;
}

function height_center(manifest: GeometryManifest) {
    if (!manifest.operations.length) return 0;
    return manifest.operations[0].dimensions.height / 2;
}

function depth_center(manifest: GeometryManifest) {
    if (!manifest.operations.length) return 0;
    return manifest.operations[0].dimensions.depth / 2;
}
