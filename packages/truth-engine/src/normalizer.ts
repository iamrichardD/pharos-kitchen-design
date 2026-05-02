/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Normalization
 * File: normalizer.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Deterministic transformation of raw strings with ReDoS protection.
 * Traceability: Issue #48, ADR-0017, Issue #74
 * ======================================================================== */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

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
     * Implements Regex Warden temporal timeout protection via Worker Threads.
     */
    public async normalize(
        mfrId: number,
        mfrName: string,
        rawInput: string,
        sourceUri: string
    ): Promise<NormalizationResult> {
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

            for (const [key, pattern] of Object.entries(rule.mappings)) {
                try {
                    // The Regex Warden: true temporal isolation
                    const match = await this.matchWithWorker(rawInput, pattern, 100); // 100ms timeout
                    if (match) {
                        extracted[key] = match[1] || match[0];
                        matchCount++;
                    }
                } catch (e: any) {
                    if (e.message === 'REGEX_TIMEOUT') {
                        isTimeout = true;
                        break;
                    }
                    // Log other errors but continue if possible
                    console.warn(`[Regex Warden] Match error for ${key}:`, e.message);
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
     * Offloads regex execution to a worker thread with a hard timeout.
     */
    private async matchWithWorker(input: string, pattern: string, timeoutMs: number): Promise<RegExpMatchArray | null> {
        return new Promise((resolve, reject) => {
            const __dirname = dirname(fileURLToPath(import.meta.url));
            // In development (vitest) and production, we point to the .js file to avoid TS loader issues.
            const workerFile = join(__dirname, 'regex_worker.js');
            
            const worker = new Worker(workerFile, {
                workerData: { input, pattern, flags: 'i' }
            });

            const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error('REGEX_TIMEOUT'));
            }, timeoutMs);

            worker.on('message', (result) => {
                clearTimeout(timeout);
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result.match);
                }
                worker.terminate();
            });

            worker.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
                worker.terminate();
            });

            worker.on('exit', (code) => {
                if (code !== 0 && code !== 1) { // 1 is often termination
                    clearTimeout(timeout);
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
    }
}

