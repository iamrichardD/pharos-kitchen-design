/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Edge Worker
 * File: src/index.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Cloudflare Worker implementing the RFC 8628 bridge at the edge.
 * Traceability: ADR 0019, ADR 0021, Issue #7
 * ======================================================================== */

import { Router, IRequest } from 'itty-router';
import { nanoid } from 'nanoid';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthRepository } from './db';
import { 
  CognitoIdentityProviderClient, 
  ListUsersCommand, 
  AdminUpdateUserAttributesCommand 
} from '@aws-sdk/client-cognito-identity-provider';

interface Env {
  DB: D1Database;
  VERIFICATION_URI: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  COGNITO_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  DEBUG?: string; // Flag to enable mock endpoints for local dev
}

interface PharosRequest extends IRequest {
  user?: any;
  impersonatedUser?: string;
}

interface ConfirmPayload {
  user_code: string;
  id_token: string;
  access_token: string;
  refresh_token: string;
}

const router = Router();

/**
 * Middleware: Verify Bearer Token and handle Impersonation
 */
const withAuth = async (request: PharosRequest, env: Env) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ 
      error: 'unauthorized', 
      message: 'Missing or invalid Authorization header. Run `pkd auth login`.' 
    }), { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await verifyIdToken(token, env);
    request.user = payload;

    // Handle X-Pharos-Impersonate (Admin-only override)
    const impersonateHeader = request.headers.get('X-Pharos-Impersonate');
    if (impersonateHeader) {
      if (payload['custom:role'] === 'ADMIN') {
        request.impersonatedUser = impersonateHeader;
        console.log(`[Impersonation] Admin ${payload.sub} is impersonating ${impersonateHeader}`);
      } else {
        return new Response(JSON.stringify({ 
          error: 'forbidden', 
          message: 'Security Violation: Only ADMIN can use X-Pharos-Impersonate.' 
        }), { status: 403 });
      }
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ 
      error: 'unauthorized', 
      message: e.message 
    }), { status: 401 });
  }
};

/**
 * Middleware: Ensure ADMIN role
 */
const withAdmin = (request: PharosRequest) => {
  if (request.user?.['custom:role'] !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'forbidden', message: 'Admin role required' }), { status: 403 });
  }
};

/**
 * Helper: Verify Cognito ID Token
 * Why: Centralized identity verification. Failing fast here prevents 
 *      unauthorized access from propagating into business logic.
 */
async function verifyIdToken(token: string, env: Env) {
  const JWKS = createRemoteJWKSet(
    new URL(`https://cognito-idp.${env.COGNITO_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`)
  );

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${env.COGNITO_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}`,
      audience: env.COGNITO_CLIENT_ID,
    });
    return payload;
  } catch (e: any) {
    if (e.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Identity session expired. Please run `pkd auth login` again.');
    }
    if (e.code === 'ERR_JWKS_FETCH_FAILED') {
      throw new Error('Failed to connect to Pharos Identity Provider (Cognito).');
    }
    throw new Error(`Authentication failed: ${e.message}`);
  }
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
 * Admin: List Users (Cognito Orchestration)
 */
router.get('/admin/users', withAuth, withAdmin, async (request: PharosRequest, env: Env) => {
  const client = new CognitoIdentityProviderClient({
    region: env.COGNITO_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    }
  });

  try {
    const command = new ListUsersCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
    });
    const response = await client.send(command);
    
    const users = response.Users?.map(u => ({
      username: u.Username,
      status: u.UserStatus,
      created: u.UserCreateDate,
      attributes: u.Attributes?.reduce((acc: any, attr) => {
        acc[attr.Name!] = attr.Value;
        return acc;
      }, {})
    }));

    return new Response(JSON.stringify({ users }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'cognito_error', message: e.message }), { status: 500 });
  }
});

/**
 * Admin: Update User Attributes/Roles
 */
router.post('/admin/users/update', withAuth, withAdmin, async (request: PharosRequest, env: Env) => {
  const { email, role } = await request.json() as { email: string, role: string };
  
  const client = new CognitoIdentityProviderClient({
    region: env.COGNITO_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    }
  });

  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'custom:role', Value: role }
      ]
    });
    await client.send(command);

    return new Response(JSON.stringify({ message: `Successfully updated user ${email} to role ${role}` }));
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'cognito_error', message: e.message }), { status: 500 });
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
