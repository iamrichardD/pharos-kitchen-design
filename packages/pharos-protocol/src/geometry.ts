/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Geometry
 * File: packages/pharos-protocol/src/geometry.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Authoritative TypeScript types and Zod schemas for 
 *          procedural geometry manifests.
 * Traceability: Issue #122
 * ======================================================================== */

import { z } from 'zod';

/**
 * Zod schema for validated coordinate tuples.
 */
export const CoordinateSchema = z.tuple([z.number(), z.number(), z.number()]);

/**
 * Zod schema for operation dimensions.
 */
export const OperationDimensionsSchema = z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive(),
});

/**
 * Zod schema for a single geometry operation.
 * Enforces Parametric Operations (Option A).
 */
export const GeometryOperationSchema = z.object({
    id: z.string(),
    type: z.literal('Extrusion'),
    profile: z.literal('Rectangle'),
    dimensions: OperationDimensionsSchema,
    origin: CoordinateSchema,
    material_class: z.string().optional().default('Default'),
});

/**
 * Zod schema for the complete geometry manifest.
 */
export const GeometryManifestSchema = z.object({
    lod: z.number().int().min(100).max(400),
    operations: z.array(GeometryOperationSchema),
});

/**
 * TypeScript types derived from Zod schemas to ensure perfect parity.
 */
export type GeometryOperation = z.infer<typeof GeometryOperationSchema>;
export type GeometryManifest = z.infer<typeof GeometryManifestSchema>;
export type OperationDimensions = z.infer<typeof OperationDimensionsSchema>;
export type Coordinate = z.infer<typeof CoordinateSchema>;
