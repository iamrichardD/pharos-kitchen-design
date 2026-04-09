/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Tests
 * File: test/handshake.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Integration test for the full RFC 8628 handshake.
 * Traceability: ADR 0019, ADR 0021, Issue #11
 * ======================================================================== */

import { describe, it, expect, vi } from 'vitest';
import router from '../src/index';

const mockEnv = {
  DB: {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    first: vi.fn().mockResolvedValue({ status: 'PENDING' }),
  },
  VERIFICATION_URI: 'http://example.com/verify',
  COGNITO_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_pool',
  COGNITO_CLIENT_ID: 'client_id',
  DEBUG: 'true'
} as any;

describe('RFC 8628 Auth Handshake', () => {
  
  it('test_should_return_device_code_when_request_is_valid', async () => {
    const req = new Request('http://auth.local/auth/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'pharos-cli' })
    });
    
    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const { device_code, user_code } = await res.json() as any;
    expect(device_code).toBeDefined();
    expect(user_code).toHaveLength(8);
  });

  it('test_should_return_pending_when_polling_before_approval', async () => {
    mockEnv.DB.first.mockResolvedValueOnce({ status: 'PENDING', ttl: 9999999999 });

    const req = new Request('http://auth.local/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_code: 'dev123', 
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code' 
      })
    });
    
    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe('authorization_pending');
  });

  it('test_should_return_tokens_when_polling_after_mock_approval', async () => {
    mockEnv.DB.first.mockResolvedValueOnce({ 
        status: 'APPROVED', 
        ttl: 9999999999,
        access_token: 'acc_123',
        id_token: 'id_123',
        refresh_token: 'ref_123'
    });

    const req = new Request('http://auth.local/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_code: 'dev123', 
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code' 
      })
    });
    
    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const tokens = await res.json() as any;
    expect(tokens.access_token).toBe('acc_123');
  });

  it('test_should_fail_when_client_id_is_missing', async () => {
    const req = new Request('http://auth.local/auth/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(400);
  });
});
