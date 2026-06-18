/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Utilities / Registry Configuration
 * File: registryConfig.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Centralized environment-backed registry configuration with safe fallbacks.
 * Traceability: Issue #267, PR #269
 * Last Updated: 2026-06-18
 * ======================================================================== */

export const DEFAULT_REGISTRY_URL = 'https://registry.iamrichardd.com/pharos-kitchen-design';
export const ENV_KEYS = ['PUBLIC_REGISTRY_URL', 'REGISTRY_URL'] as const;

export const getRegistryBaseUrl = (): string => {
    let envUrl: string | undefined;
    for (const key of ENV_KEYS) {
        const val = (typeof import.meta !== 'undefined' && import.meta.env?.[key]) ||
                    (typeof process !== 'undefined' && process.env?.[key]);
        if (val) {
            envUrl = val;
            break;
        }
    }
    
    const rawUrl = envUrl || DEFAULT_REGISTRY_URL;
    return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
};

export const getSearchIndexUrl = (): string => {
    return `${getRegistryBaseUrl()}/search-index.bin`;
};

export const getShardUrl = (categorySlug: string): string => {
    return `${getRegistryBaseUrl()}/shards/${categorySlug}.bin`;
};

export const getPingUrl = (): string => {
    try {
        const baseUrl = getRegistryBaseUrl();
        const url = new URL(baseUrl);
        return `${url.origin}/ping`;
    } catch {
        return 'https://registry.iamrichardd.com/ping';
    }
};

export class RegistryLoadError extends Error {
    public readonly status: number | undefined;
    public readonly reason: 'DENIED' | 'NETWORK' | 'MALFORMED' | 'UNKNOWN';

    constructor(message: string, reason: 'DENIED' | 'NETWORK' | 'MALFORMED' | 'UNKNOWN', status?: number) {
        super(message);
        this.name = 'RegistryLoadError';
        this.reason = reason;
        this.status = status;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
