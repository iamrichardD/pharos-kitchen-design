/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Validation
 * File: validator.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Lightweight structural validator for Pharos metadata (Fail-Fast).
 * Traceability: Issue #53 - Remediation (Split-Brain Validation)
 * ======================================================================== */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export class PharosValidator {
    private _schema: any | null = null;

    async init() {
        const schemaPath = join(__dirname, '../../pkd-core/schema/pharos-schema.json');
        const content = await readFile(schemaPath, 'utf-8');
        this._schema = JSON.parse(content);
    }

    /**
     * Performs structural validation of metadata against the Pharos schema.
     * Implements the "Fail-Fast Sentinel" pattern (Shore, 2004).
     */
    validate(metadata: any): ValidationResult {
        if (!this._schema) throw new Error("Validator not initialized. Call init() first.");

        const errors: string[] = [];
        const parameters = metadata.parameters || {};
        const requiredParams = Object.keys(this._schema.parameter_standards.shared_parameters);

        for (const param of requiredParams) {
            if (parameters[param] === undefined || parameters[param] === null) {
                errors.push(`Missing mandatory PKD parameter: ${param}`);
            }
        }

        // Basic Top-Level Integrity
        if (!metadata.name) errors.push("Missing top-level 'name' field.");
        if (!metadata.metadata_id && !parameters.PKD_ModelNumber && !parameters.PKD_ProductNumber) {
            errors.push("Missing unique identifier (SKU/ModelNumber).");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
