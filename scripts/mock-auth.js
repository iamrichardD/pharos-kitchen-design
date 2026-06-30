/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: DevSecOps / Mock Server
 * File: scripts/mock-auth.js
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Mock WebAuthn Authentication Server on port 8787.
 * Traceability: Issue #311
 * Last Updated: 2026-06-30
 * ======================================================================== */

const http = require('http');

const PORT = 8787;

const MOCK_DB = {
  'existing@iamrichardd.com': {
    loginOptions: {
      options: {
        challenge: 'auth-challenge-existing-12345',
        rpId: 'localhost',
        allowCredentials: [],
        userVerification: 'preferred'
      },
      challengeToken: 'token-login-existing',
      pkd_metadata: {
        title: 'Developer Portal',
        hook: 'Accessing administrative configuration vault.'
      }
    },
    loginVerify: {
      access_token: 'pharos_access_token_existing_user_session'
    }
  },
  'new@iamrichardd.com': {
    registerOptions: {
      options: {
        challenge: 'reg-challenge-new-67890',
        rp: { name: 'Pharos Identity Bridge', id: 'localhost' },
        user: { id: 'new-user-id', name: 'new@iamrichardd.com', displayName: 'New User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }]
      },
      challengeToken: 'token-register-new',
      pkd_metadata: {
        title: 'New Account Creation',
        hook: 'Provisioning secure identity keys.'
      }
    },
    registerVerify: {
      access_token: 'pharos_access_token_new_user_session'
    }
  }
};

const handleCors = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
};

const readJsonBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  if (handleCors(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const username = body.username || '';

      if (path === '/auth/login/options') {
        const user = MOCK_DB[username];
        if (user && user.loginOptions) {
          sendJson(res, 200, user.loginOptions);
        } else {
          sendJson(res, 404, { error: 'user_not_found' });
        }
        return;
      }

      if (path === '/auth/register/options') {
        const user = MOCK_DB[username];
        if (user && user.registerOptions) {
          sendJson(res, 200, user.registerOptions);
        } else {
          sendJson(res, 400, { error: 'invalid_username_for_registration' });
        }
        return;
      }

      if (path === '/auth/login/verify') {
        sendJson(res, 200, MOCK_DB['existing@iamrichardd.com'].loginVerify);
        return;
      }

      if (path === '/auth/register/verify') {
        sendJson(res, 200, MOCK_DB['new@iamrichardd.com'].registerVerify);
        return;
      }
    }

    sendJson(res, 404, { error: 'not_found' });
  } catch (err) {
    sendJson(res, 500, { error: 'internal_server_error', details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`📡 Mock Auth Server running on http://localhost:${PORT}`);
});
