/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Data
 * File: categories.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Central data manifest for equipment category maturity.
 * Traceability: Issue #71, ADR-0015
 * ======================================================================== */

export interface Category {
	name: string;
	coverage: number;
	fidelity: 'raw' | 'normalized' | 'verified';
	lastSync: string;
}

export const categories: Category[] = [
	{ name: 'Warewashing', coverage: 95, fidelity: 'verified', lastSync: '1d ago' },
	{ name: 'Refrigeration', coverage: 85, fidelity: 'normalized', lastSync: '12d ago' },
	{ name: 'Cooking Equipment', coverage: 40, fidelity: 'raw', lastSync: '3d ago' },
	{ name: 'Food Prep', coverage: 20, fidelity: 'raw', lastSync: '15d ago' },
	{ name: 'Serving Systems', coverage: 60, fidelity: 'normalized', lastSync: '5d ago' },
	{ name: 'Ventilation', coverage: 10, fidelity: 'raw', lastSync: '30d ago' }
];
