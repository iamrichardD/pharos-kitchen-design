/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Database
 * File: src/db.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified D1 Database provider for the RFC 8628 bridge and WebAuthn.
 * Traceability: ADR 0019, ADR 0021, Issue #206
 * ======================================================================== */

export interface User {
  id: string;
  username: string;
  role: string;
  created_at: number;
}

export interface Credential {
  id: string;
  user_id: string;
  public_key: string;
  counter: number;
  device_type: string;
  backed_up: boolean;
  transports: string;
  created_at: number;
}

export interface AuthCode {
  device_code: string;
  user_code: string;
  status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'USED';
  sub?: string;
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  ttl: number;
}

export class AuthRepository {
  constructor(private db: D1Database) {}

  // --- Users & Credentials (WebAuthn) ---

  async getUserByUsername(username: string): Promise<User | null> {
    return await this.db.prepare(
      "SELECT * FROM users WHERE username = ?"
    ).bind(username).first<User>();
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.db.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(id).first<User>();
  }

  async createUser(user: User): Promise<void> {
    await this.db.prepare(
      "INSERT INTO users (id, username, role, created_at) VALUES (?, ?, ?, ?)"
    ).bind(user.id, user.username, user.role, user.created_at).run();
  }

  async getCredentials(userId: string): Promise<Credential[]> {
    const { results } = await this.db.prepare(
      "SELECT * FROM credentials WHERE user_id = ?"
    ).bind(userId).all<Credential>();
    // Convert backed_up from number to boolean
    return results.map(r => ({ ...r, backed_up: Boolean(r.backed_up) }));
  }

  async getCredential(id: string): Promise<Credential | null> {
    const cred = await this.db.prepare(
      "SELECT * FROM credentials WHERE id = ?"
    ).bind(id).first<Credential & { backed_up: number }>();
    if (cred) {
      return { ...cred, backed_up: Boolean(cred.backed_up) };
    }
    return null;
  }

  async addCredential(cred: Credential): Promise<void> {
    await this.db.prepare(
      "INSERT INTO credentials (id, user_id, public_key, counter, device_type, backed_up, transports, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      cred.id, 
      cred.user_id, 
      cred.public_key, 
      cred.counter, 
      cred.device_type, 
      cred.backed_up ? 1 : 0, 
      cred.transports, 
      cred.created_at
    ).run();
  }

  async updateCredentialCounter(id: string, counter: number): Promise<void> {
    await this.db.prepare(
      "UPDATE credentials SET counter = ? WHERE id = ?"
    ).bind(counter, id).run();
  }

  // --- OAuth Device Flow ---

  /**
   * Creates a new pending auth session.
   */
  async createSession(device_code: string, user_code: string): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + 600; // 10 minute TTL
    await this.db.prepare(
      "INSERT INTO auth_codes (device_code, user_code, status, ttl) VALUES (?, ?, 'PENDING', ?)"
    ).bind(device_code, user_code, ttl).run();
  }

  /**
   * Retrieves an auth session by device_code for polling.
   */
  async getSession(device_code: string): Promise<AuthCode | null> {
    return await this.db.prepare(
      "SELECT * FROM auth_codes WHERE device_code = ? AND ttl > ?"
    ).bind(device_code, Math.floor(Date.now() / 1000)).first<AuthCode>();
  }

  /**
   * Updates an auth session status (Web Handshake).
   */
  async approveSession(
    user_code: string, 
    sub: string, 
    access_token: string, 
    id_token: string, 
    refresh_token: string
  ): Promise<boolean> {
    const result = await this.db.prepare(
      "UPDATE auth_codes SET status = 'APPROVED', sub = ?, access_token = ?, id_token = ?, refresh_token = ? WHERE user_code = ? AND status = 'PENDING'"
    ).bind(sub, access_token, id_token, refresh_token, user_code).run();

    return result.meta.changes > 0;
  }

  /**
   * Local-only: Approve via device_code for testing.
   */
  async mockApprove(device_code: string, sub: string): Promise<void> {
    await this.db.prepare(
      "UPDATE auth_codes SET status = 'APPROVED', sub = ?, access_token = ?, id_token = ?, refresh_token = ? WHERE device_code = ?"
    ).bind(
        sub, 
        `mock_access_${sub}`, 
        `mock_id_${sub}`, 
        `mock_refresh_${sub}`, 
        device_code
    ).run();
  }

  // --- Admin ---
  async getAllUsers(): Promise<User[]> {
      const { results } = await this.db.prepare(
          "SELECT * FROM users"
      ).all<User>();
      return results;
  }

  async updateUserRole(username: string, role: string): Promise<boolean> {
      const result = await this.db.prepare(
          "UPDATE users SET role = ? WHERE username = ?"
      ).bind(role, username).run();
      return result.meta.changes > 0;
  }
}
