/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Web / Components
 * File: apps/marketing/src/components/ThreeCanvas.tsx
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Canvas-based rendering of verified manifest geometry.
 * Traceability: Issue #122
 * ======================================================================== */

import React, { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Bounds, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { 
    type GeometryManifest, 
    type GeometryOperation 
} from '@pkd/protocol';
import { CoordinateTransformer } from '../utils/CoordinateTransformer';

interface ThreeCanvasProps {
    manifest: GeometryManifest;
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

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ manifest }) => {
    return (
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
                            {manifest.operations.map((op: GeometryOperation) => (
                                <OperationMesh key={op.id} op={op} />
                            ))}
                        </group>
                    </Bounds>
                </Stage>
                <OrbitControls makeDefault />
            </Suspense>
        </Canvas>
    );
};

export default ThreeCanvas;
