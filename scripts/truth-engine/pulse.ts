/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Execution
 * File: pulse.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Entry point for the Truth Engine synchronization loop.
 * Traceability: Issue #46, ADR-0015
 * ======================================================================== */

import { TruthEngine } from '../../packages/truth-engine/src/engine.js';
import Database from 'better-sqlite3';

async function main() {
    console.log('🚀 Pharos Truth Engine: Starting Pulse Cycle');
    
    const engine = new TruthEngine('data/truth_engine.db');
    const db = new Database('data/truth_engine.db');

    // 1. Seed Manufacturer if missing (Development)
    const mfrSeed = db.prepare(`
        INSERT OR IGNORE INTO manufacturers (name, scheme, host, catalog_path) 
        VALUES ('Frymaster', 'https', 'www.frymaster.com', '/products')
    `);
    mfrSeed.run();

    // 2. Register the catalog page as a resource if it's the first run
    const registerBase = db.prepare(`
        INSERT OR IGNORE INTO resources (mfr_id, resource_type, uri, sync_state) 
        SELECT id, 'HTML', base_url, 'STALE' FROM manufacturers WHERE name = 'Frymaster'
    `);
    registerBase.run();

    // 3. Process STALE resources
    const staleResources = db.prepare("SELECT * FROM resources WHERE sync_state = 'STALE'").all() as any[];
    
    for (const resource of staleResources) {
        const nextState = await engine.checkVitality(resource);
        
        if (nextState === 'DIVE_REQUIRED' || resource.resource_type === 'HTML') {
            // If it's the main catalog page, we ALWAYS dive for discovery in v1
            await engine.discover('Frymaster');
            engine.updateState(resource.id, 'HEALTHY');
        } else {
            engine.updateState(resource.id, nextState);
        }
        
        await engine.sleep(1000, 2000);
    }

    console.log('✅ Pulse Cycle Complete.');
}

main().catch(err => {
    console.error('❌ Pulse Cycle Failed:', err);
    process.exit(1);
});
