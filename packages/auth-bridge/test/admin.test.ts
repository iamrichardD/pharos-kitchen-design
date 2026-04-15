/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Tests
 * File: test/admin.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Verification of Admin orchestration and impersonation logic.
 * Traceability: Issue #12 - Admin Control Plane
 * ======================================================================== */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import router from '../src/index';

// Mock Cognito Client
vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const mockSend = vi.fn().mockImplementation((command) => {
    // Check for property unique to ListUsersCommand if constructor name is unreliable
    if (command.UserPoolId && !command.Username) {
      return Promise.resolve({
        Users: [
          { Username: 'test@example.com', UserStatus: 'CONFIRMED', Attributes: [{ Name: 'email', Value: 'test@example.com' }, { Name: 'custom:role', Value: 'IKD' }] }
        ]
      });
    }
    return Promise.resolve({});
  });

  return {
    CognitoIdentityProviderClient: vi.fn().mockImplementation(function() {
      return { send: mockSend };
    }),
    ListUsersCommand: vi.fn().mockImplementation(function(args) { Object.assign(this, args); }),
    AdminUpdateUserAttributesCommand: vi.fn().mockImplementation(function(args) { Object.assign(this, args); }),
  };
});

// Mock jose for token verification
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: {
      sub: 'admin-sub',
      'custom:role': 'ADMIN'
    }
  })
}));

const mockEnv = {
  COGNITO_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_pool',
  AWS_ACCESS_KEY_ID: 'access',
  AWS_SECRET_ACCESS_KEY: 'secret',
} as any;

describe('Admin Control Plane Endpoints', () => {

  it('test_should_list_users_when_requester_is_admin', async () => {
    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer valid-admin-token' }
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.users).toHaveLength(1);
    expect(data.users[0].username).toBe('test@example.com');
  });

  it('test_should_deny_listing_users_when_requester_is_not_admin', async () => {
    const { jwtVerify } = await import('jose');
    (jwtVerify as any).mockResolvedValueOnce({
      payload: { sub: 'user-sub', 'custom:role': 'IKD' }
    });

    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer valid-user-token' }
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.error).toBe('forbidden');
  });

  it('test_should_update_user_role_when_requester_is_admin', async () => {
    const req = new Request('http://auth.local/admin/users/update', {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer valid-admin-token',
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
    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 
        'Authorization': 'Bearer valid-admin-token',
        'X-Pharos-Impersonate': 'target-user-sub'
      }
    });

    // We don't have a way to easily check the internal request state here 
    // without more complex mocking, but we can verify it doesn't crash 
    // and returns 200.
    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
  });

  it('test_should_deny_impersonation_when_requester_is_not_admin', async () => {
    const { jwtVerify } = await import('jose');
    (jwtVerify as any).mockResolvedValueOnce({
      payload: { sub: 'user-sub', 'custom:role': 'IKD' }
    });

    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 
        'Authorization': 'Bearer valid-user-token',
        'X-Pharos-Impersonate': 'target-user-sub'
      }
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(403);
    const data = await res.json() as any;
    expect(data.message).toBe('Security Violation: Only ADMIN can use X-Pharos-Impersonate.');
  });
});
