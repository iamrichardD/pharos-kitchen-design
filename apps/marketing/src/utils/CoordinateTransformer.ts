/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Web / Utils
 * File: apps/marketing/src/utils/CoordinateTransformer.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Centralized coordinate mapping between AEC standards (BIM)
 *          and WebGL/Three.js environments.
 * Traceability: Issue #122, ADR 0025 (Chirality & Origin)
 * ======================================================================== */

import { Coordinate } from '@pkd/protocol';

/**
 * CoordinateTransformer handles the mapping of 3D points between systems.
 * 
 * AEC/BIM Standard (Revit):
 * - X: Horizontal (Width)
 * - Y: Depth
 * - Z: Vertical (Up)
 * - Chirality: Right-Handed
 * 
 * WebGL/Three.js Standard:
 * - X: Horizontal
 * - Y: Vertical (Up)
 * - Z: Depth
 * - Chirality: Right-Handed
 * 
 * Mapping Strategy:
 * BIM [X, Y, Z] -> Three.js [X, Z, Y]
 * Why: This ensures that "Up" in BIM (Z) remains "Up" in the browser (Y), 
 * and depth is mapped correctly to the Z-axis.
 */
export class CoordinateTransformer {
    /**
     * Transforms a BIM coordinate to a Three.js coordinate.
     * @param bimCoord [X, Y, Z] from BIM system
     * @returns [X, Y, Z] for Three.js system
     */
    static bimToThree(bimCoord: Coordinate): [number, number, number] {
        const [x, y, z] = bimCoord;
        return [x, z, y];
    }

    /**
     * Calculates the center of an object in Three.js space given its 
     * BIM origin and dimensions.
     * @param origin BIM origin [X, Y, Z]
     * @param dimensions width, depth, height
     * @returns Center position in Three.js space
     */
    static calculateThreeCenter(
        origin: Coordinate, 
        dimensions: { width: number; depth: number; height: number }
    ): [number, number, number] {
        const [x, y, z] = origin;
        const { width, depth, height } = dimensions;

        // Three.js Center Calculation:
        // X = BIM_X + Width / 2
        // Y = BIM_Z + Height / 2 (Vertical)
        // Z = BIM_Y + Depth / 2 (Depth)
        return [
            x + width / 2,
            z + height / 2,
            y + depth / 2
        ];
    }
}
