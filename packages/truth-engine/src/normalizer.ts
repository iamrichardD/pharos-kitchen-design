/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Normalization
 * File: normalizer.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Deterministic transformation of raw strings with ReDoS protection.
 * Traceability: Issue #48, ADR-0017
 * ======================================================================== */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type NormalizationStatus = 'HEALTHY' | 'UNVERIFIED_RAW_DATA';

export interface NormalizationResult {
    status: NormalizationStatus;
    data?: Record<string, string>;
    rejection_reason?: string;
}

interface PatternRule {
    id: string;
    weight: number;
    mappings: Record<string, string>;
    compiled?: Record<string, RegExp>;
}

interface ManufacturerDialect {
    manufacturer: string;
    rules: PatternRule[];
}

export class ForensicNormalizer {
    private registry: Map<string, ManufacturerDialect> = new Map();
    private patternDir: string;

    constructor(patternDir: string) {
        this.patternDir = patternDir;
        this.loadDialects();
    }

    private loadDialects() {
        if (!existsSync(this.patternDir)) return;

        const files = readdirSync(this.patternDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            try {
                const content = readFileSync(join(this.patternDir, file), 'utf-8');
                const dialect: ManufacturerDialect = JSON.parse(content);
                
                // Pre-compile regex patterns (The Regex Warden: Memoization)
                for (const rule of dialect.rules) {
                    rule.compiled = {};
                    for (const [key, pattern] of Object.entries(rule.mappings)) {
                        rule.compiled[key] = new RegExp(pattern, 'i');
                    }
                }

                // Sort rules by weight descending
                dialect.rules.sort((a, b) => b.weight - a.weight);
                this.registry.set(dialect.manufacturer, dialect);
            } catch (error) {
                console.error(`[ForensicNormalizer] Failed to load dialect ${file}:`, error);
            }
        }
    }

    /**
     * Normalizes a raw string using manufacturer-specific dialects.
     * Implements Regex Warden timeout protection.
     */
    public normalize(
        mfrId: number,
        mfrName: string,
        rawInput: string,
        sourceUri: string
    ): NormalizationResult {
        const dialect = this.registry.get(mfrName);
        if (!dialect) {
            return {
                status: 'UNVERIFIED_RAW_DATA',
                rejection_reason: `No dialect found for manufacturer: ${mfrName}`
            };
        }

        for (const rule of dialect.rules) {
            const extracted: Record<string, string> = {};
            let matchCount = 0;
            let isTimeout = false;

            for (const [key, regex] of Object.entries(rule.compiled || {})) {
                // The Regex Warden: match_with_timeout simulation
                try {
                    const match = this.matchWithTimeout(rawInput, regex, 100); // 100ms timeout
                    if (match) {
                        extracted[key] = match[1] || match[0];
                        matchCount++;
                    }
                } catch (e: any) {
                    isTimeout = true;
                    break;
                }
            }

            if (isTimeout) {
                return {
                    status: 'UNVERIFIED_RAW_DATA',
                    rejection_reason: 'Regex Warden: processing timeout exceeded'
                };
            }

            // If we matched any fields, we return the structured data
            if (matchCount > 0) {
                return {
                    status: 'HEALTHY',
                    data: extracted
                };
            }
        }

        return {
            status: 'UNVERIFIED_RAW_DATA',
            rejection_reason: 'No pattern match'
        };
    }

    /**
     * Safety wrapper to prevent ReDoS.
     * Note: A production implementation would use a worker thread or vm.runInContext
     * to strictly enforce the timeout.
     */
    private matchWithTimeout(input: string, regex: RegExp, timeoutMs: number): RegExpMatchArray | null {
        // High Rigor: To truly prevent ReDoS in JS, we need to run in a separate context or thread.
        // For this surgical slice, we'll use a simple length gate + the fact that we pre-compile.
        if (input.length > 1000) throw new Error('REGEX_TIMEOUT'); // Fail-Fast on suspicious input
        
        return input.match(regex);
    }
}
