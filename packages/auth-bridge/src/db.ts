/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Database
 * File: src/db.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified D1 Database provider for the RFC 8628 bridge.
 * Traceability: ADR 0019, ADR 0021, Issue #7
 * ======================================================================== */

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
}
