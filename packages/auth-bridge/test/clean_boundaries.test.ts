/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Tests
 * File: test/clean_boundaries.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Demonstrate Clean Boundaries and DIP by using a mock Repository.
 * Traceability: Issue #206 - Passkey Migration
 * ======================================================================== */

import { describe, it, expect, vi } from 'vitest';
import router from '../src/index';
import { IAuthRepository, User, Credential, AuthCode } from '../src/db';
import { SignJWT } from 'jose';

// 1. Define a Mock Repository (Kent Beck: "Clean test boundaries")
class MockAuthRepository implements IAuthRepository {
  users: Map<string, User> = new Map();
  credentials: Map<string, Credential[]> = new Map();

  async getUserByUsername(username: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.username === username) || null;
  }
  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }
  async createUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
  async getCredentials(userId: string): Promise<Credential[]> {
    return this.credentials.get(userId) || [];
  }
  async getCredential(id: string): Promise<Credential | null> {
      for (const creds of this.credentials.values()) {
          const found = creds.find(c => c.id === id);
          if (found) return found;
      }
      return null;
  }
  async addCredential(cred: Credential): Promise<void> {
    const creds = this.credentials.get(cred.user_id) || [];
    creds.push(cred);
    this.credentials.set(cred.user_id, creds);
  }
  async updateCredentialCounter(id: string, counter: number): Promise<void> {
      const cred = await this.getCredential(id);
      if (cred) cred.counter = counter;
  }
  async createSession(): Promise<void> {}
  async getSession(): Promise<AuthCode | null> { return null; }
  async approveSession(): Promise<boolean> { return true; }
  async mockApprove(): Promise<void> {}
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  async updateUserRole(username: string, role: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    if (user) {
        user.role = role;
        return true;
    }
    return false;
  }
}

const mockRepo = new MockAuthRepository();

const mockEnv = {
  DB: {} as any, // Not used because we inject the REPO
  REPO: mockRepo,
  JWT_SECRET: 'clean_secret',
  RP_ID: 'localhost',
  EXPECTED_ORIGIN: 'http://localhost:3000',
  DEBUG: 'true'
} as any;

async function generateToken(payload: any) {
  const secret = new TextEncoder().encode(mockEnv.JWT_SECRET);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

describe('Auth Bridge: Clean Boundaries (DIP)', () => {

  it('test_should_list_users_using_mock_repository_when_requester_is_admin', async () => {
    // Setup state in mock repo
    mockRepo.users.set('admin-1', { id: 'admin-1', username: 'admin', role: 'ADMIN', created_at: 1 });
    mockRepo.users.set('user-1', { id: 'user-1', username: 'designer-1', role: 'IKD', created_at: 2 });

    const token = await generateToken({ sub: 'admin-1', role: 'ADMIN' });
    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const res = await router.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    
    // We expect 2 users because the mock repo has 2 users
    expect(data.users).toHaveLength(2);
    expect(data.users.find((u: any) => u.username === 'designer-1')).toBeDefined();
  });

  it('test_should_fail_fast_when_jwt_secret_is_missing_in_production', async () => {
    const badEnv = { ...mockEnv, JWT_SECRET: '', DEBUG: 'false' };
    const token = await generateToken({ sub: 'admin-1', role: 'ADMIN' });
    const req = new Request('http://auth.local/admin/users', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const res = await router.fetch(req, badEnv);
    expect(res.status).toBe(401);
    const data = await res.json() as any;
    expect(data.message).toContain('SEC_ERR: JWT_SECRET is missing');
  });
});
