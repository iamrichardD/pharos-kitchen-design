/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: DevSecOps / Mock Server
 * File: scripts/mock-auth.js
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Mock WebAuthn Authentication Server with dynamic routing map.
 * Traceability: Issue #311
 * Last Updated: 2026-06-30
 * ======================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;

// Load Mock DB
const dbPath = path.join(__dirname, 'mock-db.json');
const MOCK_DB = JSON.parse(fs.readFileSync(dbPath, 'utf8')).database;

const ROUTES = {
  LOGIN_OPTIONS: '/auth/login/options',
  REGISTER_OPTIONS: '/auth/register/options',
  LOGIN_VERIFY: '/auth/login/verify',
  REGISTER_VERIFY: '/auth/register/verify',
};

const STATUS_CODES = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

// CORS configuration helper
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

// Helper: Find user in DB by username or challenge token
const findUserByUsername = (username) => MOCK_DB[username] || null;

const findUserByChallengeToken = (token) => {
  for (const username in MOCK_DB) {
    const user = MOCK_DB[username];
    if (user.loginOptions && user.loginOptions.challengeToken === token) {
      return { username, user, type: 'login' };
    }
    if (user.registerOptions && user.registerOptions.challengeToken === token) {
      return { username, user, type: 'register' };
    }
  }
  return null;
};

// ROUTING HANDLERS
const handleLoginOptions = async (req, res, body) => {
  const user = findUserByUsername(body.username);
  if (user && user.loginOptions) {
    sendJson(res, STATUS_CODES.OK, user.loginOptions);
  } else {
    sendJson(res, STATUS_CODES.NOT_FOUND, { error: 'user_not_found' });
  }
};

const handleRegisterOptions = async (req, res, body) => {
  const user = findUserByUsername(body.username);
  if (user && user.registerOptions) {
    sendJson(res, STATUS_CODES.OK, user.registerOptions);
  } else {
    sendJson(res, STATUS_CODES.BAD_REQUEST, { error: 'invalid_username_for_registration' });
  }
};

const handleLoginVerify = async (req, res, body) => {
  const token = body.challengeToken;
  const match = findUserByChallengeToken(token);
  if (match && match.type === 'login' && match.user.loginVerify) {
    sendJson(res, STATUS_CODES.OK, match.user.loginVerify);
  } else {
    sendJson(res, STATUS_CODES.BAD_REQUEST, { error: 'invalid_challenge_or_credentials' });
  }
};

const handleRegisterVerify = async (req, res, body) => {
  const token = body.challengeToken;
  const match = findUserByChallengeToken(token);
  if (match && match.type === 'register' && match.user.registerVerify) {
    sendJson(res, STATUS_CODES.OK, match.user.registerVerify);
  } else {
    sendJson(res, STATUS_CODES.BAD_REQUEST, { error: 'invalid_challenge_or_credentials' });
  }
};

// ROUTING DICTIONARY
const ROUTING_MAP = {
  [`POST:${ROUTES.LOGIN_OPTIONS}`]: handleLoginOptions,
  [`POST:${ROUTES.REGISTER_OPTIONS}`]: handleRegisterOptions,
  [`POST:${ROUTES.LOGIN_VERIFY}`]: handleLoginVerify,
  [`POST:${ROUTES.REGISTER_VERIFY}`]: handleRegisterVerify,
};

const server = http.createServer(async (req, res) => {
  if (handleCors(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const routeKey = `${req.method}:${path}`;

  try {
    const handler = ROUTING_MAP[routeKey];
    if (handler) {
      const body = await readJsonBody(req);
      await handler(req, res, body);
    } else {
      sendJson(res, STATUS_CODES.NOT_FOUND, { error: 'not_found' });
    }
  } catch (err) {
    sendJson(res, STATUS_CODES.INTERNAL_ERROR, { error: 'internal_server_error', details: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`📡 Mock Auth Server running on http://localhost:${PORT}`);
  });
}

module.exports = server;
