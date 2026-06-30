/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Data
 * File: categories.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central data manifest for equipment category maturity.
 * Traceability: Issue #71, ADR-0015
 * Last Updated: 2026-06-29
 * ======================================================================== */

export interface Category {
	name: string; // Brand Name (e.g. Hobart)
	category: string; // Equipment Category (e.g. Warewashing)
	models: string; // Model Family (e.g. LXe Undercounter Series)
	coverage: number; // Schema Coverage Percentage
	fidelity: 'raw' | 'normalized' | 'verified';
	lastSync: string;
}

export const categories: Category[] = [
	{ name: 'Hobart', category: 'Warewashing', models: 'LXe Undercounter Series', coverage: 95, fidelity: 'verified', lastSync: '1d ago' },
	{ name: 'Vulcan', category: 'Cooking Equipment', models: 'V-Series Heavy Duty Ranges', coverage: 100, fidelity: 'verified', lastSync: '3d ago' },
	{ name: 'AccuTemp', category: 'Specialty Cooking', models: 'Evolution Steamer Series', coverage: 85, fidelity: 'normalized', lastSync: '12d ago' },
	{ name: 'ACP, Inc.', category: 'Specialty Cooking', models: 'Menumaster Commercial Microwaves', coverage: 60, fidelity: 'normalized', lastSync: '15d ago' },
	{ name: 'Pharos Kitchen Systems', category: 'Warewashing', models: 'PHX-750-HE (Development)', coverage: 100, fidelity: 'raw', lastSync: 'Live' }
];

if (categories.length === 0) {
	throw new Error("[PHAROS_FATAL]: Categories manifest must not be empty.");
}
