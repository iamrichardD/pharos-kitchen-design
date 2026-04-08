/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Edge Worker
 * File: src/index.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Cloudflare Worker implementing the RFC 8628 bridge at the edge.
 * Traceability: ADR 0019, ADR 0021, Issue #7
 * ======================================================================== */

import { Router } from 'itty-router';
import { nanoid } from 'nanoid';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthRepository } from './db';

interface Env {
  DB: D1Database;
  VERIFICATION_URI: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  COGNITO_REGION: string;
  DEBUG?: string; // Flag to enable mock endpoints for local dev
}

interface ConfirmPayload {
  user_code: string;
  id_token: string;
  access_token: string;
  refresh_token: string;
}

const router = Router();

/**
 * Helper: Verify Cognito ID Token
 */
async function verifyIdToken(token: string, env: Env) {
  const JWKS = createRemoteJWKSet(
    new URL(`https://cognito-idp.${env.COGNITO_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
  );

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://cognito-idp.${env.COGNITO_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}`,
    audience: env.COGNITO_CLIENT_ID,
  });

  return payload;
}

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
  const repo = new AuthRepository(env.DB);

  try {
    await repo.createSession(device_code, user_code);

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

  const repo = new AuthRepository(env.DB);

  try {
    const session = await repo.getSession(device_code);

    if (!session) {
      return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
    }

    if (session.status === 'PENDING') {
      return new Response(JSON.stringify({ error: 'authorization_pending' }), { status: 400 });
    }

    if (session.status === 'APPROVED') {
      return new Response(JSON.stringify({
        access_token: session.access_token,
        id_token: session.id_token,
        refresh_token: session.refresh_token,
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
 */
router.post('/auth/confirm', async (request, env: Env) => {
  const { user_code, id_token, access_token, refresh_token } = await request.json() as ConfirmPayload;
  
  try {
    // 1. Verify the ID Token from Cognito
    const payload = await verifyIdToken(id_token, env);
    const sub = payload.sub;

    if (!sub) {
        return new Response(JSON.stringify({ error: 'invalid_token_payload' }), { status: 400 });
    }

    // 2. Update the repository
    const repo = new AuthRepository(env.DB);
    const success = await repo.approveSession(user_code, sub, access_token, id_token, refresh_token);

    if (!success) {
      return new Response(JSON.stringify({ error: 'invalid_code_or_expired' }), { status: 400 });
    }

    return new Response(JSON.stringify({ message: 'Success' }));
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'server_error', details: e.message }), { status: 500 });
  }
});

/**
 * Local-only MOCK: Approval via device_code
 * Guarded by env.DEBUG flag.
 */
router.post('/auth/mock-approve', async (request, env: Env) => {
  if (env.DEBUG !== 'true') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const { device_code, sub } = await request.json() as any;
  const repo = new AuthRepository(env.DB);
  
  try {
    await repo.mockApprove(device_code, sub);
    return new Response(JSON.stringify({ message: 'Mock approval successful' }));
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
});

export default {
  fetch: router.handle
};
