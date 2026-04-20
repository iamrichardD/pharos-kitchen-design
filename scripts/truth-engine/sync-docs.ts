/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Scripts / Truth Engine / Doc Sync
 * File: sync-docs.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verifies Mermaid ERD in docs/SCHEMA.md against Truth Engine schema.
 * Traceability: Issue #46, Issue #47, Issue #50
 * ======================================================================== */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCHEMA_SQL_PATH = join(process.cwd(), 'packages/truth-engine/src/schema.sql');
const DOC_SCHEMA_PATH = join(process.cwd(), 'docs/SCHEMA.md');

function syncDocs() {
    console.log('--- Truth Engine Doc Sync Verification ---');
    
    const sqlContent = readFileSync(SCHEMA_SQL_PATH, 'utf8');
    const docContent = readFileSync(DOC_SCHEMA_PATH, 'utf8');

    // Extract table names from SQL
    const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)/g;
    const tables: { name: string, start: number }[] = [];
    let match;
    while ((match = tableRegex.exec(sqlContent)) !== null) {
        tables.push({ name: match[1], start: match.index });
    }

    console.log(`Found tables in SQL: ${tables.map(t => t.name.toUpperCase()).join(', ')}`);

    let allFound = true;

    // Zero-Tolerance Table and Column Verification
    tables.forEach((table, index) => {
        const tableName = table.name.toUpperCase();
        const singular = tableName.endsWith('S') ? tableName.slice(0, -1) : tableName;
        
        // Table existence check
        if (!docContent.includes(tableName) && !docContent.includes(singular)) {
            console.error(`[Error] Table ${tableName} (or ${singular}) not found in docs/SCHEMA.md ERD.`);
            allFound = false;
        } else {
            console.log(`[OK] Table ${tableName} present in docs/SCHEMA.md.`);
        }

        // Column extraction: match until the next CREATE TABLE or end of file
        const nextTableStart = tables[index + 1] ? tables[index + 1].start : sqlContent.length;
        const tableBlock = sqlContent.substring(table.start, nextTableStart);
        
        // Extract words at the start of lines inside the parentheses
        // Better: look for lines that start with some spaces and then a word, but skip keywords
        const columnRegex = /^\s+(\w+)/gm;
        let colMatch;
        while ((colMatch = columnRegex.exec(tableBlock)) !== null) {
            const column = colMatch[1];
            const ignoredKeywords = ['FOREIGN', 'UNIQUE', 'PRIMARY', 'CHECK', 'CONSTRAINT'];
            if (!ignoredKeywords.includes(column.toUpperCase())) {
                if (!docContent.includes(column)) {
                    console.error(`[Error] Column ${column} of table ${tableName} is missing or named differently in docs/SCHEMA.md.`);
                    allFound = false;
                } else {
                    // Optional: verbose column check
                    // console.log(`  [OK] Column ${column} present.`);
                }
            }
        }
    });

    if (!allFound) {
        console.error('--- Verification Failed: Schema Drift Detected ---');
        process.exit(1);
    }

    console.log('--- Verification Complete: Pharos Green ---');
}

syncDocs();
