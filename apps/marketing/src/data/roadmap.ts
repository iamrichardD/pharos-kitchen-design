/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Data
 * File: roadmap.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central data manifest for system maturity.
 * Traceability: Issue #71, ADR-0012
 * ======================================================================== */

export interface RoadmapItem {
  name: string;
  status: 'Deployed' | 'In Construction' | 'Blueprint Approved' | 'Research Phase';
  phase: string;
  tag: 'CORE' | 'IDENTITY' | 'BRIDGE' | 'TOOLING' | 'PROTOCOL' | 'UX' | 'AI';
  description: string;
}

export const roadmapItems: RoadmapItem[] = [
  { 
    name: "Secure Designer Profiles", 
    status: "Deployed", 
    phase: "Sprint 1", 
    tag: "CORE",
    description: "Hardened identity storage with privacy-first attribution for all your design work." 
  },
  { 
    name: "Universal Tool Sync", 
    status: "Deployed", 
    phase: "Sprint 2", 
    tag: "IDENTITY",
    description: "Connect your professional identity across web and desktop tools in seconds." 
  },
  { 
    name: "High-Performance Design Engine", 
    status: "Deployed", 
    phase: "Sprint 2", 
    tag: "BRIDGE",
    description: "A lightning-fast core for metadata normalization that works on any operating system." 
  },
  { 
    name: "Designer Admin Portal", 
    status: "Deployed", 
    phase: "Sprint 3", 
    tag: "CORE",
    description: "Advanced controls for managing manufacturer permissions and design team roles." 
  },
  { 
    name: "Professional Search (v0.1.0)", 
    status: "Deployed", 
    phase: "Sprint 3", 
    tag: "TOOLING",
    description: "A professional command-line tool for instant equipment discovery and validation." 
  },
  { 
    name: "Universal Search Standard", 
    status: "Deployed", 
    phase: "Sprint 3", 
    tag: "PROTOCOL",
    description: "A unified way to search for professional kitchen equipment across the entire ecosystem." 
  },
  { 
    name: "Manufacturer-Verified Specs", 
    status: "Deployed", 
    phase: "Sprint 3", 
    tag: "IDENTITY",
    description: "Direct-from-factory data signatures to guarantee your specifications are authorized." 
  },
  { 
    name: "Smart Equipment DNA", 
    status: "In Construction", 
    phase: "Sprint 4", 
    tag: "BRIDGE",
    description: "Lightweight, connected data that stays with your 3D models throughout the project life." 
  },
  { 
    name: "Instant Discovery (Cmd+K)", 
    status: "In Construction", 
    phase: "Sprint 4", 
    tag: "UX",
    description: "Lightning-fast equipment placement directly within your Revit environment." 
  },
  { 
    name: "AI Equipment Intelligence", 
    status: "Blueprint Approved", 
    phase: "Sprint 5", 
    tag: "AI",
    description: "Standardized interface for AI agents to assist with complex equipment queries." 
  },
  { 
    name: "Guided Specification", 
    status: "Blueprint Approved", 
    phase: "Sprint 6", 
    tag: "AI",
    description: "Intelligent assistance for choosing equipment based on energy and project criteria." 
  }
];
