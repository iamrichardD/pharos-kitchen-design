/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Tests
 * File: test/webauthn.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of WebAuthn Registration and Authentication flows.
 * Traceability: Issue #206 - Passkey Migration
 * ======================================================================== */

import { describe, it, expect, vi } from 'vitest';
import router from '../src/index';

const mockEnv = {
  DB: {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
  },
  JWT_SECRET: 'test_secret',
  RP_ID: 'localhost',
  EXPECTED_ORIGIN: 'http://localhost:3000',
} as any;

describe('WebAuthn Passkey Flow', () => {

  it('test_should_return_registration_options_when_user_is_new', async () => {
    mockEnv.DB.first.mockResolvedValueOnce(null); // User doesn't exist

    const req = new Request('http://auth.local/auth/register/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'new-user' })
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.options).toBeDefined();
    expect(data.challengeToken).toBeDefined();
    expect(data.options.user.name).toBe('new-user');
  });

  it('test_should_fail_registration_when_user_exists', async () => {
    mockEnv.DB.first.mockResolvedValueOnce({ id: '1', username: 'existing' });

    const req = new Request('http://auth.local/auth/register/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'existing' })
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe('user_exists');
  });

  it('test_should_return_login_options_when_user_exists', async () => {
    mockEnv.DB.first.mockResolvedValueOnce({ id: 'user-1', username: 'user1' });
    mockEnv.DB.all.mockResolvedValueOnce({
        results: [{ id: 'cred-1', user_id: 'user-1', public_key: 'pk', transports: 'usb' }]
    });

    const req = new Request('http://auth.local/auth/login/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user1' })
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.options).toBeDefined();
    expect(data.challengeToken).toBeDefined();
    expect(data.options.allowCredentials).toHaveLength(1);
  });
});
