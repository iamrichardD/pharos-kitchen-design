/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Regex Warden
 * File: regex_worker.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Isolated worker thread for safe regex execution (ReDoS Prevention).
 * Traceability: Issue #48, ADR-0017
 * ======================================================================== */

import { parentPort, workerData } from 'node:worker_threads';

/**
 * The Regex Worker execution logic.
 * This runs in a separate thread to ensure ReDoS does not block the main event loop.
 */
if (parentPort) {
    try {
        const { input, pattern, flags } = workerData;
        const regex = new RegExp(pattern, flags);
        const match = input.match(regex);
        
        parentPort.postMessage({ match });
    } catch (error: any) {
        parentPort.postMessage({ error: error.message });
    }
}
