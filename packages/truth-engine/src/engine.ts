/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Core
 * File: engine.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Event-driven state machine for manufacturer data synchronization.
 * Traceability: Issue #46, Issue #47, Issue #50, ADR-0017, Issue #124
 * ======================================================================== */
import Database from 'better-sqlite3';
import { chromium } from '@playwright/test';
import { ForensicNormalizer, NormalizationResult } from './normalizer.js';
import { WasmDialectLoader } from './loader.js';
import { Plugin } from '@extism/extism';
import { join, dirname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PharosValidator } from './validator.js';

// State Types
export type SyncState = 'STALE' | 'PENDING_VERIFICATION' | 'DIVE_REQUIRED' | 'HEALTHY' | 'BROKEN';

export interface Resource {
    id: number;
    mfr_id: number;
    resource_type: string;
    uri: string;
    etag?: string;
    last_modified?: string;
    sync_state: SyncState;
}

export class TruthEngine {
    private _dbPath: string;
    private _db!: Database.Database;
    private normalizer!: ForensicNormalizer;
    private wasmPlugins: Map<number, Plugin> = new Map();
    private validator = new PharosValidator();
    private _initialized = false;

    constructor(dbOrPath?: Database.Database | string) {
        if (dbOrPath instanceof Database) {
            this._db = dbOrPath;
            this._dbPath = ':memory:'; // Placeholder for instance-based DB
        } else {
            this._dbPath = dbOrPath || 'data/truth_engine.db';
        }
    }

    /**
     * Initializes the engine, ensuring the directory exists and the schema is applied.
     * This must be called before using the engine.
     */
    public async init() {
        if (this._initialized) return;

        // 1. Environment Resilience: Ensure data directory exists
        if (this._dbPath !== ':memory:') {
            const dbDir = dirname(resolve(this._dbPath));
            try {
                await mkdir(dbDir, { recursive: true });
            } catch (error: any) {
                throw new Error(`[Critical] Failed to create data directory at ${dbDir}: ${error.message}. Check filesystem permissions.`);
            }
            
            if (!this._db) {
                this._db = new Database(this._dbPath);
            }
        }

        // 2. Component Initialization
        const patternDir = process.env.PKD_PATTERN_DIR || join(process.cwd(), 'patterns');
        this.normalizer = new ForensicNormalizer(patternDir);

        await this.initializeSchema();
        await this.validator.init();
        this._initialized = true;
    }

    private ensureInitialized() {
        if (!this._initialized) {
            throw new Error('[Critical] TruthEngine is not initialized. Call await engine.init() before use.');
        }
    }

    /**
     * Closes the database connection.
     */
    public close() {
        this._db.close();
    }

    private async initializeSchema() {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const schemaPath = join(__dirname, 'schema.sql');
        const schema = await readFile(schemaPath, 'utf8');
        this._db.exec(schema);
    }

    async sleep(min = 2000, max = 5000) {
        const ms = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkVitality(resource: Resource): Promise<SyncState> {
        try {
            const response = await fetch(resource.uri, { method: 'HEAD' });
            
            if (!response.ok) {
                return response.status === 404 ? 'BROKEN' : 'STALE';
            }

            const newEtag = response.headers.get('etag');
            const newLastMod = response.headers.get('last-modified');

            if (newEtag === resource.etag && newLastMod === resource.last_modified) {
                return 'HEALTHY';
            }

            return 'DIVE_REQUIRED';
        } catch (error) {
            return 'BROKEN';
        }
    }

    updateState(id: number, state: SyncState, metadata?: { etag?: string, last_modified?: string }) {
        this.ensureInitialized();
        const stmt = this._db.prepare(`
            UPDATE resources 
            SET sync_state = ?, etag = ?, last_modified = ?, last_checked_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        stmt.run(state, metadata?.etag || null, metadata?.last_modified || null, id);
    }

    /**
     * Transforms raw strings into structured metadata.
     * Implements the "Forensic Isolation Ward" for unmatched data.
     */
    public async handleTransformation(resourceId: number, rawInput: string): Promise<NormalizationResult> {
        this.ensureInitialized();
        const resource = this._db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Resource;
        if (!resource) throw new Error(`Resource ${resourceId} not found.`);

        const mfr = this._db.prepare('SELECT name, wasm_path, wasm_hash FROM manufacturers WHERE id = ?').get(resource.mfr_id) as any;
        if (!mfr) throw new Error(`Manufacturer for resource ${resourceId} not found.`);

        let result: NormalizationResult;

        // Try WASM dialect first if configured
        if (mfr.wasm_path && mfr.wasm_hash) {
            try {
                let plugin = this.wasmPlugins.get(resource.mfr_id);
                if (!plugin) {
                    const fullPath = resolve(mfr.wasm_path);
                    plugin = await WasmDialectLoader.loadPlugin(fullPath, mfr.wasm_hash);
                    this.wasmPlugins.set(resource.mfr_id, plugin);
                }

                const dialectBuffer = await WasmDialectLoader.normalize(plugin, mfr.name, rawInput);
                result = {
                    status: dialectBuffer.status.toUpperCase() as any,
                    data: dialectBuffer.parameters as any,
                    rejection_reason: dialectBuffer.rejection_reason
                };
            } catch (error: any) {
                console.error(`[TruthEngine] WASM Transformation failed for ${mfr.name}:`, error);
                result = await this.normalizer.normalize(resource.mfr_id, mfr.name, rawInput, resource.uri);
            }
        } else {
            result = await this.normalizer.normalize(resource.mfr_id, mfr.name, rawInput, resource.uri);
        }

        if (result.status === 'HEALTHY' && result.data) {
            const data = result.data;
            const sku = data.PKD_ProductNumber || data.PKD_ModelNumber;
            
            // No-Masking Principle: If SKU is missing, fail fast to forensic queue
            if (sku) {
                // Atomic Transaction: Registry Promotion (The "Bake" Preparation)
                const transaction = this._db.transaction(() => {
                    this._db.prepare(`
                        INSERT OR REPLACE INTO equipment_registry (
                            mfr_id, resource_id, sku, name, category, voltage, btu, metadata
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        resource.mfr_id, 
                        resourceId, 
                        sku,
                        data.name || 'Unknown Equipment',
                        data.PKD_MainCategory || null,
                        data.PKD_Voltage || null,
                        data.PKD_BTU || null,
                        JSON.stringify(data)
                    );

                    this.updateState(resourceId, 'HEALTHY');
                });
                transaction();
                return result;
            } else {
                result.status = 'UNVERIFIED_RAW_DATA';
                result.rejection_reason = 'MISSING_SKU';
            }
        } 
        
        if (result.status === 'UNVERIFIED_RAW_DATA') {
            const hash = createHash('sha256').update(rawInput).digest('hex');
            
            // Atomic Transaction: Forensic Deferral
            const transaction = this._db.transaction(() => {
                // Log the investigation
                this._db.prepare(`
                    INSERT OR IGNORE INTO forensic_investigations (
                        mfr_id, resource_id, raw_input, raw_input_hash, source_uri, rejection_reason
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `).run(resource.mfr_id, resourceId, rawInput, hash, resource.uri, result.rejection_reason || 'Unknown');

                // Update sync log
                this._db.prepare(`
                    INSERT INTO sync_logs (mfr_id, resource_id, status_code, action_taken, message)
                    VALUES (?, ?, 202, 'FORENSIC_DEFERRAL', ?)
                `).run(resource.mfr_id, resourceId, `Transformation failed: ${result.rejection_reason}`);

                // Move state machine to DIVE_REQUIRED
                this.updateState(resourceId, 'DIVE_REQUIRED');
            });

            transaction();
        }

        return result;
    }

    /**
     * Bakes the truth_engine.db registry into a sharded JSON file system.
     * Organization: [stagingDir]/[manufacturer]/[category]/[sku].json
     */
    /**
     * Bakes the truth_engine.db registry into a sharded JSON file system.
     * Organization: [stagingDir]/shard_[manufacturer_slug]_[category_slug].json
     */
    public async bake(stagingDir: string) {
        this.ensureInitialized();

        // 1. Path Integrity Sentinel: Prevent arbitrary deletion (Shift-Left Security)
        const absoluteStaging = resolve(stagingDir) + sep;
        const allowedBase = resolve(".artifacts") + sep;
        const allowedData = resolve("data") + sep;

        if (!absoluteStaging.startsWith(allowedBase) && !absoluteStaging.startsWith(allowedData)) {
            throw new Error(`[Security] Bake aborted: stagingDir '${stagingDir}' is outside of allowed paths (.artifacts/ or data/).`);
        }

        // 2. Atomic Wipe: Prevent "Zombie Data" from previous runs
        if (existsSync(absoluteStaging)) {
            await rm(absoluteStaging, { recursive: true, force: true });
        }
        await mkdir(absoluteStaging, { recursive: true });

        // 3. Manufacturer Enrichment & Metadata Generation
        const stmt = this._db.prepare(`
            SELECT 
                r.sku, r.name, r.category, r.metadata,
                m.name as manufacturer_name
            FROM equipment_registry r
            JOIN manufacturers m ON r.mfr_id = m.id
        `);

        const records = stmt.all() as any[];
        const shards: Map<string, any> = new Map();

        for (const row of records) {
            const rawMetadata = JSON.parse(row.metadata);

            // 4. Split-Brain Validation Remediation: Validate before write
            const validation = this.validator.validate(rawMetadata);
            if (!validation.isValid) {
                console.warn(`[Bake] Skipping invalid record ${row.sku}: ${validation.errors.join(", ")}`);
                continue;
            }

            const mfrSlug = row.manufacturer_name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
            const catSlug = (row.category || "uncategorized").replace(/[^a-z0-9]/gi, "_").toLowerCase();
            const shardId = `${mfrSlug}_${catSlug}`;

            if (!shards.has(shardId)) {
                shards.set(shardId, {
                    shard_id: shardId,
                    v: "1.0.0",
                    records: {}
                });
            }

            // Remove pkd_prologue if present.
            // Why: To ensure lean shards for fast JIT WASM parsing (Requirement: REJECTED from production data shards).
            // Traceability: Issue #124
            const leanMetadata = { ...rawMetadata };
            delete leanMetadata.pkd_prologue;

            shards.get(shardId).records[row.sku] = leanMetadata;
        }

        const writeTasks: Promise<void>[] = [];
        for (const [shardId, shardData] of shards.entries()) {
            const filePath = join(stagingDir, `shard_${shardId}.json`);
            writeTasks.push(writeFile(filePath, JSON.stringify(shardData, null, 2)));
        }

        await Promise.all(writeTasks);
        return records.length;
    }

    async discover(mfrName: string) {
        this.ensureInitialized();
        const mfr = this._db.prepare('SELECT * FROM manufacturers WHERE name = ?').get(mfrName) as any;
        if (!mfr) throw new Error(`Manufacturer ${mfrName} not found in Truth Engine.`);

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        // High Rigor: Global Response Listener (Passive & Active)
        page.on('response', async response => {
            const url = response.url();
            
            // 1. Passive Discovery: Static Assets
            if (url.endsWith('.pdf') || url.match(/\.(jpg|jpeg|png|webp|rfa)$/i)) {
                let type = 'IMAGE';
                if (url.endsWith('.pdf')) type = 'PDF';
                if (url.endsWith('.rfa')) type = 'RFA';
                this.registerResource(mfr.id, url, type);
            }

            // 2. Active Discovery: KCL API Interception (Issue #62)
            if (mfr.kcl_enabled && url.includes('kclcad.com/www/GetModelData/')) {
                try {
                    const text = await response.text();
                    const hash = createHash('sha256').update(text).digest('hex');
                    
                    // Register the API payload as a resource for transformation
                    this._db.prepare(`
                        INSERT OR IGNORE INTO resources (mfr_id, resource_type, uri, content_hash, sync_state)
                        VALUES (?, 'KCL_API_PAYLOAD', ?, ?, 'DIVE_REQUIRED')
                    `).run(mfr.id, url, hash);
                } catch (e) {
                    console.warn(`[Active Discovery] Failed to capture KCL payload: ${url}`);
                }
            }
        });

        await page.goto(mfr.base_url);
        await this.sleep(3000, 6000);
        
        await page.evaluate(async () => {
            for (let i = 0; i < 3; i++) {
                window.scrollBy(0, window.innerHeight);
                await new Promise(r => setTimeout(r, 1000));
            }
        });

        await browser.close();
    }

    /**
     * Registers a discovered resource if it passes the SSRF Domain Sentinel.
     */
    public registerResource(mfrId: number, uri: string, type: string) {
        this.ensureInitialized();
        const mfr = this._db.prepare('SELECT host, kcl_enabled FROM manufacturers WHERE id = ?').get(mfrId) as any;
        if (!mfr) {
            console.warn(`[Security] Blocked resource registration for unknown manufacturer ID: ${mfrId}`);
            return;
        }

        let url: URL;
        try {
            url = new URL(uri);
        } catch (e) {
            console.warn(`[Security] Blocked invalid URI: ${uri}`);
            return;
        }

        // Scheme Validation (ADR-0023)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            console.warn(`[Security] Blocked unauthorized protocol: ${url.protocol}`);
            return;
        }

        const mfrHost = mfr.host;
        const baseDomain = mfrHost.startsWith('www.') ? mfrHost.substring(4) : mfrHost;

        // SSRF Sentinel: Only allow the manufacturer's own domain, subdomains, or authorized proxies
        const isAllowedDomain = url.hostname === mfrHost || 
                               url.hostname === baseDomain || 
                               url.hostname.endsWith(`.${baseDomain}`) ||
                               (mfr.kcl_enabled && url.hostname.endsWith('kclcad.com'));

        if (!isAllowedDomain) {
            const msg = `Blocked unauthorized resource URI (Domain Mismatch): ${uri}`;
            console.warn(`[Security] ${msg}`);

            // Persistent Security Logging (High Rigor Refactor)
            // We use a NULL resource_id to indicate a "Global System Event"
            this._db.prepare(`
                INSERT INTO sync_logs (mfr_id, resource_id, status_code, action_taken, message)
                VALUES (?, NULL, 403, 'BLOCKED', ?)
            `).run(mfrId, `${mfrHost}: ${msg}`);

            return;
        }


        const stmt = this._db.prepare(`
            INSERT OR IGNORE INTO resources (mfr_id, resource_type, uri, sync_state)
            VALUES (?, ?, ?, 'STALE')
        `);
        stmt.run(mfrId, type, uri);
    }
}
