/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Tests
 * File: test/handshake.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Integration test for the full RFC 8628 handshake.
 * Traceability: ADR 0019, ADR 0021
 * ======================================================================== */

import { describe, it, expect, beforeAll } from 'vitest';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3001';

describe('RFC 8628 Auth Handshake', () => {
  it('should complete the full device authorization flow', async () => {
    // 1. Request Device Code
    const deviceRes = await fetch(`${BRIDGE_URL}/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: 'pharos-cli' })
    });
    
    expect(deviceRes.status).toBe(200);
    const { device_code, user_code, verification_uri } = await deviceRes.json() as any;
    
    expect(device_code).toBeDefined();
    expect(user_code).toHaveLength(8);
    expect(verification_uri).toContain('/verify');

    // 2. Initial Poll (Should be PENDING)
    const poll1Res = await fetch(`${BRIDGE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_code, 
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code' 
      })
    });
    
    expect(poll1Res.status).toBe(400);
    const poll1Data = await poll1Res.json() as any;
    expect(poll1Data.error).toBe('authorization_pending');

    // 3. Simulate Web Handshake (Approval)
    // In local dev, we use the mock endpoint to approve the session.
    // This simulates the user entering the user_code on the /verify page.
    const approveRes = await fetch(`${BRIDGE_URL}/auth/mock-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_code, 
        sub: 'test-user-uuid' 
      })
    });
    expect(approveRes.status).toBe(200);

    // 4. Final Poll (Should be SUCCESS)
    const poll2Res = await fetch(`${BRIDGE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_code, 
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code' 
      })
    });
    
    expect(poll2Res.status).toBe(200);
    const tokens = await poll2Res.json() as any;
    expect(tokens.access_token).toBeDefined();
    expect(tokens.token_type).toBe('Bearer');
  });

  it('should fail on invalid client_id', async () => {
    const res = await fetch(`${BRIDGE_URL}/auth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });
});
