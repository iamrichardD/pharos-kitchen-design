/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Config / Test
 * File: packages/pharos-protocol/src/config.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unit tests for URL config resolver.
 * Traceability: Closes #312 (Production Redirect Authentication Resolution)
 * Last Updated: 2026-07-01
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAuthEndpoint } from './config';

describe('Auth Endpoint Resolution', () => {
  const originalProcessEnv = process.env;
  const originalWindow = typeof window !== 'undefined' ? window : undefined;

  beforeEach(() => {
    // Reset global env
    process.env = { ...originalProcessEnv };
  });

  afterEach(() => {
    process.env = originalProcessEnv;
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      // @ts-ignore
      delete global.window;
    }
  });

  it('test_should_resolve_to_production_when_node_env_is_production', () => {
    process.env.NODE_ENV = 'production';
    expect(getAuthEndpoint()).toBe('https://iamrichardd.com/pharos-kitchen-design/api/auth');
  });

  it('test_should_resolve_to_production_when_hostname_is_production', () => {
    // Mock window
    global.window = {
      location: {
        hostname: 'iamrichardd.com'
      }
    } as any;
    
    // Ensure process.env does not override
    delete process.env.NODE_ENV;

    expect(getAuthEndpoint()).toBe('https://iamrichardd.com/pharos-kitchen-design/api/auth');
  });

  it('test_should_resolve_to_local_when_development', () => {
    delete process.env.NODE_ENV;
    // @ts-ignore
    delete global.window;

    expect(getAuthEndpoint()).toBe('http://localhost:8787');
  });
});
