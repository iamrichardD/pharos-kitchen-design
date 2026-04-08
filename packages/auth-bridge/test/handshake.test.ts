/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Tests
 * File: test/handshake.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Integration test for the full RFC 8628 handshake.
 * Traceability: ADR 0019, ADR 0021, Issue #11
 * ======================================================================== */

import { describe, it, expect } from 'vitest';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3001';

describe('RFC 8628 Auth Handshake', () => {
  
  it('test_should_return_device_code_when_request_is_valid', async () => {
    const res = await fetch(`${BRIDGE_URL}/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'pharos-cli' })
    });
    
    expect(res.status).toBe(200);
    const { device_code, user_code } = await res.json() as any;
    expect(device_code).toBeDefined();
    expect(user_code).toHaveLength(8);
  });

  it('test_should_return_pending_when_polling_before_approval', async () => {
    // 1. Setup session
    const deviceRes = await fetch(`${BRIDGE_URL}/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'pharos-cli' })
    });
    const { device_code } = await deviceRes.json() as any;

    // 2. Poll
    const res = await fetch(`${BRIDGE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_code, 
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code' 
      })
    });
    
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe('authorization_pending');
  });

  it('test_should_return_tokens_when_polling_after_mock_approval', async () => {
    // 1. Setup session
    const deviceRes = await fetch(`${BRIDGE_URL}/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'pharos-cli' })
    });
    const { device_code } = await deviceRes.json() as any;

    // 2. Mock Approval
    await fetch(`${BRIDGE_URL}/auth/mock-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code, sub: 'test-user' })
    });

    // 3. Poll
    const res = await fetch(`${BRIDGE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_code, 
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code' 
      })
    });
    
    expect(res.status).toBe(200);
    const tokens = await res.json() as any;
    expect(tokens.access_token).toBeDefined();
  });

  it('test_should_fail_when_client_id_is_missing', async () => {
    const res = await fetch(`${BRIDGE_URL}/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });
});
