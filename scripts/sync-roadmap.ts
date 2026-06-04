/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: DevSecOps / Tooling
 * File: scripts/sync-roadmap.ts
 * Author: PMA (via Gemini CLI)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Automated Roadmap Synchronization Engine (Living Map Protocol).
 * Traceability: Issue #208, ADR-0051
 * Last Updated: 2026-06-04
 * ======================================================================== */

import fs from 'node:fs';
import path from 'node:path';

interface RoadmapItem {
  name: string;
  status: 'Deployed' | 'In Construction' | 'Blueprint Approved' | 'Research Phase';
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
  
  // Regex patterns
  const sprintPattern = /^### (Sprint [\d.]+)/;
  const issuePattern = /^- \[([ x])\] \*\*Issue #(\d+)\*\*: \[TAG: ([^\]]+)\] ([^\[]+) \[DESC: ([^\]]+)\]/;

  for (const line of lines) {
    const sprintMatch = line.match(sprintPattern);
    if (sprintMatch) {
      currentSprint = sprintMatch[1];
      continue;
    }

    const issueMatch = line.match(issuePattern);
    if (issueMatch) {
      const [_, checked, id, tag, name, desc] = issueMatch;
      const status: RoadmapItem['status'] = checked === 'x' ? 'Deployed' : defaultStatus;
      
      items.push({
        name: name.trim().replace(/\.$/, ''),
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

items[${items.length}]{name, status, phase, tag, description}:
`;

  for (const item of items) {
    toon += `  "${item.name}", "${item.status}", "${item.phase}", "${item.tag}", "${item.description}"\n`;
  }
  
  return toon;
}

function main() {
  console.log("🚀 Initializing Pharos Roadmap Sync Engine...");
  
  // Legacy Foundation Items (Pre-Automation Phase)
  const legacyItems: RoadmapItem[] = [
    { name: "Secure Designer Profiles", status: "Deployed", phase: "Sprint 1", tag: "CORE", description: "Hardened identity storage with privacy-first attribution." },
    { name: "Universal Tool Sync", status: "Deployed", phase: "Sprint 2", tag: "IDENTITY", description: "Connect your professional identity across tools." },
    { name: "High-Performance Design Engine", status: "Deployed", phase: "Sprint 2", tag: "BRIDGE", description: "Lightning-fast core for metadata normalization." },
    { name: "Designer Admin Portal", status: "Deployed", phase: "Sprint 3", tag: "CORE", description: "Advanced controls for managing manufacturer permissions." },
    { name: "Professional Search (v0.1.0)", status: "Deployed", phase: "Sprint 3", tag: "TOOLING", description: "Instant equipment discovery and validation tool." },
    { name: "Universal Search Standard", status: "Deployed", phase: "Sprint 3", tag: "PROTOCOL", description: "Unified search standard across the ecosystem." },
    { name: "Manufacturer-Verified Specs", status: "Deployed", phase: "Sprint 3", tag: "IDENTITY", description: "Direct-from-factory data signatures." }
  ];

  const progressItems = parseMarkdownLog('@PROGRESS.md', 'Deployed');
  const todoItems = parseMarkdownLog('@TODO.md', 'In Construction');
  
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
          if (titleMatch) {
            shardItems.push({
              name: titleMatch[1].trim(),
              status: 'In Construction',
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