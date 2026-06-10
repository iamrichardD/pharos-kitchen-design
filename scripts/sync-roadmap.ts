/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: DevSecOps / Tooling
 * File: scripts/sync-roadmap.ts
 * Author: PMA (via Gemini CLI)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Automated Roadmap Synchronization Engine (Living Map Protocol).
<<<<<<< HEAD
 * Traceability: Issue #208, ADR-0051
=======
 * Traceability: Issue #208, #234, ADR-0051
>>>>>>> a5203c7 (feat(roadmap): update sync engine with future section awareness (Issue #234))
 * Last Updated: 2026-06-08
 * ======================================================================== */

import fs from 'node:fs';
import path from 'node:path';

interface RoadmapItem {
  id: number | null;
  name: string;
<<<<<<< HEAD
  status: 'Deployed' | 'In Progress' | 'In Construction' | 'Blueprint Approved' | 'Research Phase';
=======
  status: 'Deployed' | 'In Construction' | 'Blueprint Approved' | 'Research Phase' | 'In Progress';
>>>>>>> a5203c7 (feat(roadmap): update sync engine with future section awareness (Issue #234))
  phase: string;
  tag: string;
  description: string;
}

const TAG_MAP: Record<string, string> = {
  'Security': 'IDENTITY',
  'Core': 'CORE',
  'Governance': 'PROTOCOL',
  'UI': 'UX',
  'CI': 'TOOLING',
  'Debt': 'CORE',
  'Utility': 'TOOLING',
  'Interop': 'BRIDGE',
  'Perf': 'CORE',
  'Infra': 'TOOLING',
  'Protocol': 'PROTOCOL',
  'AI': 'AI'
};

const DEFAULT_TAG = 'CORE';

function parseMarkdownLog(filePath: string, defaultStatus: RoadmapItem['status']): RoadmapItem[] {
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const items: RoadmapItem[] = [];
  
  let currentSprint = 'Backlog';
<<<<<<< HEAD
  let sectionStatus = defaultStatus;
=======
  let isFutureSection = false; // ADR-0051: Future blueprints tracking
>>>>>>> a5203c7 (feat(roadmap): update sync engine with future section awareness (Issue #234))
  
  // Regex patterns
  const sectionPattern = /^## (.*)/;
  const sprintPattern = /^### (Sprint [\d.]+)/;
<<<<<<< HEAD
  const issuePattern = /^- \[([ x])\] \*\*Issue #([^:]+)\*\*: \[TAG: ([^\]]+)\] (.*)/;

  for (const line of lines) {
    // Section Tracking (ADR-0051)
    const sectionMatch = line.match(sectionPattern);
    if (sectionMatch) {
      const sectionTitle = sectionMatch[1];
      if (sectionTitle.includes('Active Sprint')) {
        sectionStatus = 'In Progress';
      } else if (sectionTitle.includes('Future Sprints')) {
        sectionStatus = 'Blueprint Approved';
      }
      continue;
=======
  const sectionPattern = /^## (.*)/;
  const issuePattern = /^- \[([ x])\] \*\*Issue #(\d+)\*\*: \[TAG: ([^\]]+)\] ([^\[]+) \[DESC: ([^\]]+)\]/;

  for (const line of lines) {
    // Check for section transitions (ADR-0051)
    const sectionMatch = line.match(sectionPattern);
    if (sectionMatch) {
      const sectionTitle = sectionMatch[1];
      if (sectionTitle.includes('Future Sprints')) {
        isFutureSection = true;
      } else if (sectionTitle.includes('Active Sprint')) {
        isFutureSection = false;
      }
>>>>>>> a5203c7 (feat(roadmap): update sync engine with future section awareness (Issue #234))
    }

    const sprintMatch = line.match(sprintPattern);
    if (sprintMatch) {
      currentSprint = sprintMatch[1];
      continue;
    }

    const issueMatch = line.match(issuePattern);
    if (issueMatch) {
<<<<<<< HEAD
      const [_, checked, id, tag, rest] = issueMatch;
      
      // Extract Description if present
      const descMatch = rest.match(/\[DESC: ([^\]]+)\]/);
      const desc = descMatch ? descMatch[1] : 'Authoritative task item captured from log.';
      
      // Clean up Name (remove DESC and ECT markers)
      const name = rest.split('[DESC:')[0].split('[ECT:')[0].trim().replace(/\.$/, '');

      // Universal Truth: Checked is always Deployed
      const status: RoadmapItem['status'] = checked === 'x' ? 'Deployed' : sectionStatus;
=======
      const [_, checked, id, tag, name, desc] = issueMatch;
      
      // Determine status based on section and checked state
      let status: RoadmapItem['status'];
      if (checked === 'x') {
        status = 'Deployed';
      } else if (isFutureSection) {
        status = 'Blueprint Approved';
      } else {
        status = defaultStatus;
      }
>>>>>>> a5203c7 (feat(roadmap): update sync engine with future section awareness (Issue #234))
      
      items.push({
        id: parseInt(id, 10) || null,
        name,
        status,
        phase: currentSprint,
        tag: TAG_MAP[tag.trim()] || DEFAULT_TAG,
        description: desc.trim()
      });
    }
  }
  
  return items;
}

function generateToon(items: RoadmapItem[]): string {
  const timestamp = new Date().toISOString();
  
  let toon = `/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Content
 * File: roadmap.toon
 * Purpose: Automated reflection of authoritative internal logs.
 * Last Synced: ${timestamp}
 * ======================================================================== */

title: Pharos System Roadmap
type: roadmap
lastSynced: ${timestamp}

items[${items.length}]{id, name, status, phase, tag, description}:
`;

  for (const item of items) {
    toon += `  "${item.id ?? 0}", "${item.name}", "${item.status}", "${item.phase}", "${item.tag}", "${item.description}"\n`;
  }
  
  return toon;
}

function main() {
  console.log("🚀 Initializing Pharos Roadmap Sync Engine...");
  
  // Rationale: Decoupled historical data (Crucible Audit #215 / ADR-0051)
  const HISTORICAL_PATH = path.join('.project', 'historical-roadmap.json');
  let legacyItems: RoadmapItem[] = [];
  
  try {
    if (fs.existsSync(HISTORICAL_PATH)) {
      const historicalData = JSON.parse(fs.readFileSync(HISTORICAL_PATH, 'utf-8'));
      legacyItems = historicalData.legacy_items;
      console.log(`🔎 Loaded ${legacyItems.length} historical items from ${HISTORICAL_PATH}`);
    }
  } catch (e) {
    console.warn("⚠️ Warning: Could not load historical-roadmap.json, proceeding with active logs only.");
  }

  const progressItems = parseMarkdownLog('@PROGRESS.md', 'Deployed');
  const todoItems = parseMarkdownLog('@TODO.md', 'In Progress');
  
  // ADR-0046: Shard-Based Logging (Task-specific .toon files)
  const shardItems: RoadmapItem[] = [];
  const shardsDir = '.project/shards';
  if (fs.existsSync(shardsDir)) {
    console.log(`🔎 Scanning shards in ${shardsDir}...`);
    // Recursive scan for *.toon files
    const scanShards = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanShards(fullPath);
        } else if (entry.name.endsWith('.toon')) {
          // Simple extraction for shards (minimal for now)
          const content = fs.readFileSync(fullPath, 'utf-8');
          const titleMatch = content.match(/title:\s*([^\n]+)/);
          const tagMatch = content.match(/tags?:\s*([^\n]+)/);
          const issueMatch = content.match(/issue:\s*#?(\d+)/);
          if (titleMatch) {
            shardItems.push({
              id: issueMatch ? parseInt(issueMatch[1], 10) : null,
              name: titleMatch[1].trim(),
              status: 'In Progress',
              phase: 'Active Shard',
              tag: tagMatch ? (TAG_MAP[tagMatch[1].split(',')[0].trim()] || DEFAULT_TAG) : DEFAULT_TAG,
              description: 'In-progress task captured from authoritative shard.'
            });
          }
        }
      }
    };
    scanShards(shardsDir);
  }

  // Merge items, prioritizing @PROGRESS for status
  const allItems = [...legacyItems, ...progressItems, ...todoItems, ...shardItems];
  
  // Deduplicate by name (preferring Deployed status)
  const uniqueItemsMap = new Map<string, RoadmapItem>();
  for (const item of allItems) {
    const existing = uniqueItemsMap.get(item.name);
    if (!existing || (item.status === 'Deployed' && existing.status !== 'Deployed')) {
      uniqueItemsMap.set(item.name, item);
    }
  }
  
  const finalItems = Array.from(uniqueItemsMap.values());
  
  const toonContent = generateToon(finalItems);
  const outputPath = path.join('apps/marketing/src/content/roadmap.toon');
  
  fs.writeFileSync(outputPath, toonContent);
  console.log(`✅ Roadmap synchronized: ${finalItems.length} items verified.`);
  console.log(`📂 Output: ${outputPath}`);
}

main();