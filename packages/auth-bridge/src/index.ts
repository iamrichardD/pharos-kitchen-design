/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Edge Worker
 * File: src/index.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Cloudflare Worker implementing RFC 8628 and Passkey-First Identity.
 * Traceability: ADR 0019, ADR 0049, ADR 0050, Issue #206
 * ======================================================================== */

import { Router, IRequest } from 'itty-router';
import { nanoid } from 'nanoid';
import { jwtVerify, SignJWT } from 'jose';
import { Buffer } from 'node:buffer';
import { AuthRepository, IAuthRepository } from './db';
import { PasskeyService } from './service';

interface Env {
  DB: D1Database;
  VERIFICATION_URI: string;
  JWT_SECRET: string;
  RP_ID: string;
  EXPECTED_ORIGIN: string;
  DEBUG?: string;
  REPO?: IAuthRepository; // Optional injection for testing
}

interface PharosRequest extends IRequest {
  user?: any;
  impersonatedUser?: string;
  repo: IAuthRepository;
  passkey: PasskeyService;
}

const router = Router<PharosRequest, [Env, any]>();

// --- Utilities ---

async function verifyLocalToken(token: string, env: Env) {
  if (!env.JWT_SECRET && env.DEBUG !== 'true') {
    throw new Error('SEC_ERR: JWT_SECRET is missing. Fail-fast sentinel triggered.');
  }
  const secret = new TextEncoder().encode(env.JWT_SECRET || 'fallback_secret_for_dev_only');
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (e: any) {
    throw new Error(`Authentication failed: ${e.message}`);
  }
}

async function signLocalToken(payload: any, env: Env, expiresIn: string = '1h') {
  if (!env.JWT_SECRET && env.DEBUG !== 'true') {
    throw new Error('SEC_ERR: JWT_SECRET is missing. Fail-fast sentinel triggered.');
  }
  const secret = new TextEncoder().encode(env.JWT_SECRET || 'fallback_secret_for_dev_only');
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

// --- Middlewares ---

const withRepo = (request: PharosRequest, env: Env) => {
  request.repo = env.REPO || new AuthRepository(env.DB);
  request.passkey = new PasskeyService(
    request.repo, 
    env.RP_ID || 'localhost', 
    env.EXPECTED_ORIGIN || 'http://localhost:3000'
  );
};

const withAuth = async (request: PharosRequest, env: Env) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await verifyLocalToken(token, env);
    request.user = payload;

    const impersonateHeader = request.headers.get('X-Pharos-Impersonate');
    if (impersonateHeader) {
      if (payload['role'] === 'ADMIN') {
        request.impersonatedUser = impersonateHeader;
      } else {
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
      }
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'unauthorized', message: e.message }), { status: 401 });
  }
};

const withAdmin = (request: PharosRequest) => {
  if (request.user?.['role'] !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }
};

// --- WebAuthn Endpoints ---

router.post('/auth/register/options', withRepo, async (request, env: Env) => {
  const { username } = await request.json() as { username: string };
  if (!username) return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 });

  let user = await request.repo.getUserByUsername(username);
  if (user) {
     return new Response(JSON.stringify({ error: 'user_exists' }), { status: 400 });
  }

  user = { id: nanoid(), username, role: 'IKD', created_at: Date.now() };
  await request.repo.createUser(user);

  const options = await request.passkey.generateRegistrationOptions(user.id, user.username);

  const challengeToken = await signLocalToken({ challenge: options.challenge, userId: user.id }, env, '5m');

  return new Response(JSON.stringify({ options, challengeToken }), { headers: { 'Content-Type': 'application/json' } });
});

router.post('/auth/register/verify', withRepo, async (request, env: Env) => {
  const { response, challengeToken } = await request.json() as any;

  try {
    const { challenge, userId } = await verifyLocalToken(challengeToken, env) as any;

    const verification = await request.passkey.verifyRegistration(userId, response, challenge);

    if (verification.verified) {
      const user = await request.repo.getUserById(userId);
      const access_token = await signLocalToken({ sub: userId, role: user?.role }, env, '1h');

      return new Response(JSON.stringify({ verified: true, access_token }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
  return new Response(JSON.stringify({ error: 'verification_failed' }), { status: 400 });
});

router.post('/auth/login/options', withRepo, async (request, env: Env) => {
  const { username } = await request.json() as { username: string };
  
  const user = await request.repo.getUserByUsername(username);
  if (!user) return new Response(JSON.stringify({ error: 'user_not_found' }), { status: 400 });

  const options = await request.passkey.generateAuthenticationOptions(user.id);

  const challengeToken = await signLocalToken({ challenge: options.challenge, userId: user.id }, env, '5m');

  return new Response(JSON.stringify({ options, challengeToken }), { headers: { 'Content-Type': 'application/json' } });
});

router.post('/auth/login/verify', withRepo, async (request, env: Env) => {
  const { response, challengeToken } = await request.json() as any;

  try {
    const { challenge, userId } = await verifyLocalToken(challengeToken, env) as any;
    
    const verification = await request.passkey.verifyAuthentication(userId, response, challenge);

    if (verification.verified) {
      const user = await request.repo.getUserById(userId);
      const access_token = await signLocalToken({ sub: userId, role: user?.role }, env, '1h');
      
      return new Response(JSON.stringify({ verified: true, access_token }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
  return new Response(JSON.stringify({ error: 'verification_failed' }), { status: 400 });
});

// --- RFC 8628 ---

router.post('/auth/device', withRepo, async (request, env: Env) => {
  const { client_id } = await request.json() as { client_id: string };
  if (!client_id) return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 });

  const device_code = nanoid(32);
  const user_code = nanoid(8).toUpperCase();

  await request.repo.createSession(device_code, user_code);

  return new Response(JSON.stringify({
    device_code,
    user_code,
    verification_uri: env.VERIFICATION_URI,
    expires_in: 600,
    interval: 5
  }), { headers: { 'Content-Type': 'application/json' } });
});

router.post('/auth/token', withRepo, async (request, env: Env) => {
  const { device_code, grant_type } = await request.json() as { device_code: string, grant_type: string };
  if (grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
    return new Response(JSON.stringify({ error: 'unsupported_grant_type' }), { status: 400 });
  }

  const session = await request.repo.getSession(device_code);

  if (!session) return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
  if (session.status === 'PENDING') return new Response(JSON.stringify({ error: 'authorization_pending' }), { status: 400 });
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
});

router.post('/auth/confirm', withRepo, async (request, env: Env) => {
  const { user_code, access_token } = await request.json() as any;
  try {
    const payload = await verifyLocalToken(access_token, env) as any;
    const sub = payload.sub;

    const cli_access_token = await signLocalToken({ sub, role: payload.role }, env, '1h');
    const cli_id_token = await signLocalToken({ sub, role: payload.role }, env, '1h');
    const cli_refresh_token = nanoid(32);

    const success = await request.repo.approveSession(user_code, sub, cli_access_token, cli_id_token, cli_refresh_token);

    if (!success) return new Response(JSON.stringify({ error: 'invalid_code_or_expired' }), { status: 400 });
    return new Response(JSON.stringify({ message: 'Success' }));
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'server_error', details: e.message }), { status: 500 });
  }
});

// --- Admin ---

router.get('/admin/users', withRepo, withAuth, withAdmin, async (request: PharosRequest, env: Env) => {
  const users = await request.repo.getAllUsers();
  return new Response(JSON.stringify({ users }), { headers: { 'Content-Type': 'application/json' } });
});

router.post('/admin/users/update', withRepo, withAuth, withAdmin, async (request: PharosRequest, env: Env) => {
  const { email, role } = await request.json() as { email: string, role: string };

  const success = await request.repo.updateUserRole(email, role);
  if (success) {
    return new Response(JSON.stringify({ message: `Successfully updated user ${email} to role ${role}` }));
  }
  return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
});

router.post('/auth/mock-approve', withRepo, async (request, env: Env) => {
  if (env.DEBUG !== 'true') return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

  const { device_code, sub } = await request.json() as any;
  await request.repo.mockApprove(device_code, sub);
  return new Response(JSON.stringify({ message: 'Mock approval successful' }));
});

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router.handle(request as PharosRequest, env, ctx)
};