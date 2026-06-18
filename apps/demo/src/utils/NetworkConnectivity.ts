/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Demo / Utilities / Network Connectivity
 * File: NetworkConnectivity.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Robust network connectivity detection using navigator.onLine and HTTP HEAD pings.
 * Traceability: Issue #252
 * Last Updated: 2026-06-16
 * ======================================================================== */

import { useState, useEffect } from 'react';
import { getPingUrl } from './registryConfig';

export interface ConnectivityDetector {
    checkConnectivity(): Promise<boolean>;
}

export class PingConnectivityDetector implements ConnectivityDetector {
    private pingUrl: string;

    constructor(pingUrl = getPingUrl()) {
        this.pingUrl = pingUrl;
    }

    async checkConnectivity(): Promise<boolean> {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return false;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        try {
            // Cache busting ping URL
            const url = `${this.pingUrl}?t=${Date.now()}`;
            await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return true;
        } catch (err) {
            clearTimeout(timeoutId);
            return false;
        }
    }
}

export const defaultDetector = new PingConnectivityDetector();

export function useConnectivity(detector: ConnectivityDetector = defaultDetector) {
    const [isOnline, setIsOnline] = useState<boolean>(true);

    const triggerCheck = async () => {
        const online = await detector.checkConnectivity();
        setIsOnline(online);
    };

    useEffect(() => {
        let active = true;

        const check = async () => {
            const online = await detector.checkConnectivity();
            if (active) {
                setIsOnline(online);
            }
        };

        // Initial check
        check();

        const handleOnline = () => {
            check();
        };

        const handleOffline = () => {
            if (active) {
                setIsOnline(false);
            }
        };

        const handleConnectionChange = () => {
            check();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }

        const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
        const connection = nav ? (nav.connection || nav.mozConnection || nav.webkitConnection) : null;
        if (connection) {
            connection.addEventListener('change', handleConnectionChange);
        }

        // Periodic check to ensure real internet status changes - relaxed to 60s
        const intervalId = setInterval(check, 60000);

        return () => {
            active = false;
            clearInterval(intervalId);
            if (typeof window !== 'undefined') {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            }
            if (connection) {
                connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, [detector]);

    return { isOnline, triggerCheck };
}
