/**
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Configuration / Navigation
 * License: FSL-1.1 (See LICENSE file for details)
 * File: navigation.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * Purpose: Central definition of the main marketing navigation schema.
 * Traceability: Issue #313
 * Last Updated: 2026-06-30
 */

export interface NavItem {
  label: string;
  path: string;
  class?: string;
}

export const navItems: NavItem[] = [
  { label: 'Guide', path: '/pharos-kitchen-design/guide' },
  { label: 'Revit Plugin', path: '/pharos-kitchen-design/revit-plugin' },
  { label: 'Download', path: '/pharos-kitchen-design/download' },
  { label: 'Reference', path: '/pharos-kitchen-design/reference' },
  { label: 'Blog', path: '/pharos-kitchen-design/blog' },
  { label: 'Roadmap', path: '/pharos-kitchen-design/roadmap' }
];
