/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Edge Worker
 * File: src/index.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Cloudflare Worker implementing the RFC 8628 bridge at the edge.
 * Traceability: ADR 0019, ADR 0021
 * ======================================================================== */

import { Router } from 'itty-router';
import { nanoid } from 'nanoid';

interface Env {
  DB: D1Database;
  VERIFICATION_URI: string;
}

const router = Router();

/**
 * RFC 8628: Device Authorization Endpoint
 */
router.post('/auth/device', async (request, env: Env) => {
  const { client_id } = await request.json() as { client_id: string };
  if (!client_id) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 });
  }

  const device_code = nanoid(32);
  const user_code = nanoid(8).toUpperCase();
  const ttl = Math.floor(Date.now() / 1000) + 600; // 10 minute expiry

  try {
    await env.DB.prepare(
      "INSERT INTO auth_codes (device_code, user_code, status, ttl) VALUES (?, ?, 'PENDING', ?)"
    ).bind(device_code, user_code, ttl).run();

    return new Response(JSON.stringify({
      device_code,
      user_code,
      verification_uri: env.VERIFICATION_URI,
      expires_in: 600,
      interval: 5
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
});

/**
 * RFC 8628: Token Endpoint (Polling)
 */
router.post('/auth/token', async (request, env: Env) => {
  const { device_code, grant_type } = await request.json() as { device_code: string, grant_type: string };

  if (grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
    return new Response(JSON.stringify({ error: 'unsupported_grant_type' }), { status: 400 });
  }

  try {
    const session = await env.DB.prepare(
      "SELECT * FROM auth_codes WHERE device_code = ? AND ttl > ?"
    ).bind(device_code, Math.floor(Date.now() / 1000)).first();

    if (!session) {
      return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
    }

    if (session.status === 'PENDING') {
      return new Response(JSON.stringify({ error: 'authorization_pending' }), { status: 400 });
    }

    if (session.status === 'APPROVED') {
      // Logic for issuing final tokens goes here (Cognito Admin Auth)
      return new Response(JSON.stringify({
        access_token: `mock_edge_token_for_${session.sub}`,
        token_type: 'Bearer',
        expires_in: 3600
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'expired_token' }), { status: 400 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
});

/**
 * Web Handshake: Confirmation Endpoint
 * User visits /verify on the marketing site, which calls this.
 */
router.post('/auth/confirm', async (request, env: Env) => {
  const { user_code, sub } = await request.json() as { user_code: string, sub: string };
  
  try {
    const result = await env.DB.prepare(
      "UPDATE auth_codes SET status = 'APPROVED', sub = ? WHERE user_code = ? AND status = 'PENDING'"
    ).bind(sub, user_code.toUpperCase()).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 400 });
    }

    return new Response(JSON.stringify({ message: 'Success' }));
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
});

/**
 * Local-only MOCK: Approval via device_code
 */
router.post('/auth/mock-approve', async (request, env: Env) => {
  const { device_code, sub } = await request.json() as { device_code: string, sub: string };
  
  try {
    await env.DB.prepare(
      "UPDATE auth_codes SET status = 'APPROVED', sub = ? WHERE device_code = ?"
    ).bind(sub, device_code).run();

    return new Response(JSON.stringify({ message: 'Mock approval successful' }));
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
});

export default {
  fetch: router.handle
};
