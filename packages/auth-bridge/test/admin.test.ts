/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Tests
 * File: test/admin.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of Admin orchestration and impersonation logic.
 * Traceability: Issue #206 - Passkey Migration
 * ======================================================================== */

import { describe, it, expect, vi } from 'vitest';
import router from '../src/index';
import { SignJWT } from 'jose';

// Mock DB
const mockEnv = {
  DB: {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({
      results: [
        { id: '1', username: 'test@example.com', role: 'IKD', created_at: 123 }
      ]
    }),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
  },
  JWT_SECRET: 'test_secret',
} as any;

// Helper to generate a token
async function generateToken(payload: any) {
  const secret = new TextEncoder().encode(mockEnv.JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

describe('Admin Control Plane Endpoints', () => {

  it('test_should_list_users_when_requester_is_admin', async () => {
    const token = await generateToken({ sub: 'admin', role: 'ADMIN' });
    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.users).toHaveLength(1);
    expect(data.users[0].username).toBe('test@example.com');
  });

  it('test_should_deny_listing_users_when_requester_is_not_admin', async () => {
    const token = await generateToken({ sub: 'user', role: 'IKD' });
    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.error).toBe('forbidden');
  });

  it('test_should_update_user_role_when_requester_is_admin', async () => {
    const token = await generateToken({ sub: 'admin', role: 'ADMIN' });
    const req = new Request('http://auth.local/admin/users/update', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'test@example.com', role: 'ADMIN' })
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.message).toContain('Successfully updated');
  });

  it('test_should_allow_impersonation_when_requester_is_admin', async () => {
    const token = await generateToken({ sub: 'admin', role: 'ADMIN' });
    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Pharos-Impersonate': 'target-user-sub'
      }
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
  });

  it('test_should_deny_impersonation_when_requester_is_not_admin', async () => {
    const token = await generateToken({ sub: 'user', role: 'IKD' });
    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Pharos-Impersonate': 'target-user-sub'
      }
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.error).toBe('forbidden');
  });
});
