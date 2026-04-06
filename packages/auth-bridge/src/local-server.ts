/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Auth-Bridge / Local Server
 * File: src/local-server.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Local Express server to simulate Lambda endpoints for RFC 8628.
 * Traceability: ADR 0019
 * ======================================================================== */

import express from 'express';
import { nanoid } from 'nanoid';
import { createAuthSession, getAuthSession } from './db.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const VERIFICATION_URI = process.env.VERIFICATION_URI || "http://localhost:4321/verify";

/**
 * RFC 8628: Device Authorization Endpoint
 */
app.post('/auth/device', async (req, res) => {
  const { client_id } = req.body;
  if (!client_id) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Missing client_id' });
  }

  const device_code = nanoid(32);
  const user_code = nanoid(8).toUpperCase(); // Simplified ABCD-1234 style

  try {
    await createAuthSession(device_code, user_code);
    res.json({
      device_code,
      user_code,
      verification_uri: VERIFICATION_URI,
      expires_in: 600,
      interval: 5
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * RFC 8628: Token Endpoint (Polling)
 */
app.post('/auth/token', async (req, res) => {
  const { device_code, grant_type } = req.body;

  if (grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  try {
    const session = await getAuthSession(device_code);
    if (!session) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    if (session.status === 'PENDING') {
      return res.status(400).json({ error: 'authorization_pending' });
    }

    if (session.status === 'APPROVED') {
      // In production, this would exchange the approved sub for real Cognito tokens.
      // For the local mock, we return a signed JWT placeholder.
      return res.json({
        access_token: `mock_access_token_for_${session.sub}`,
        id_token: `mock_id_token_for_${session.sub}`,
        refresh_token: `mock_refresh_token_for_${session.sub}`,
        token_type: 'Bearer',
        expires_in: 3600
      });
    }

    res.status(400).json({ error: 'expired_token' });
  } catch (error) {
    console.error('Polling error:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

/**
 * Local-only MOCK: Approval Endpoint (Simulates the Web Handshake)
 */
app.post('/auth/mock-approve', async (req, res) => {
  const { device_code, sub } = req.body;
  // This is a surgical mock for testing only.
  // In production, this logic happens via the web-facing /auth/confirm Lambda.
  // TODO: Implement proper approval logic in src/db.ts
  res.json({ message: "Mock approval successful (Not implemented in DB yet)" });
});

app.listen(PORT, () => {
  console.log(`🚀 Auth Bridge (Local) running at http://localhost:${PORT}`);
});
