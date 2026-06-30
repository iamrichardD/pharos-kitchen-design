/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: DevSecOps / Testing
 * File: scripts/test-mock-auth.js
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Automated unit tests for mock auth simulator.
 * Traceability: Issue #311
 * Last Updated: 2026-06-30
 * ======================================================================== */

const http = require('http');
const server = require('./mock-auth');

const PORT = 8788;

// Utility to send POST request
const postRequest = (path, payload) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: JSON.parse(body),
        });
      });
    });

    req.on('error', (err) => { reject(err); });
    req.write(data);
    req.end();
  });
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(` ✅ PASS: ${message}`);
};

const runTests = async () => {
  console.log('🚀 Starting Mock Auth Server integration tests on port', PORT);
  
  // Start server
  await new Promise((resolve) => server.listen(PORT, resolve));

  try {
    // Test 1: Login options for existing user
    const res1 = await postRequest('/auth/login/options', { username: 'existing@iamrichardd.com' });
    assert(res1.statusCode === 200, 'Existing user login options returns 200');
    assert(res1.body.challengeToken === 'token-login-existing', 'Challenge token matches database');

    // Test 2: Login options for missing user
    const res2 = await postRequest('/auth/login/options', { username: 'unknown@example.com' });
    assert(res2.statusCode === 404, 'Unknown user login options returns 404');
    assert(res2.body.error === 'user_not_found', 'Error payload reports user_not_found');

    // Test 3: Register options for new user
    const res3 = await postRequest('/auth/register/options', { username: 'new@iamrichardd.com' });
    assert(res3.statusCode === 200, 'New user register options returns 200');
    assert(res3.body.challengeToken === 'token-register-new', 'Challenge token matches database');

    // Test 4: Verification of existing user credentials via challenge token
    const res4 = await postRequest('/auth/login/verify', { challengeToken: 'token-login-existing' });
    assert(res4.statusCode === 200, 'Existing user verification returns 200');
    assert(res4.body.access_token === 'pharos_access_token_existing_user_session', 'Access token is correctly mapped');

    // Test 5: Verification of new user credentials via challenge token
    const res5 = await postRequest('/auth/register/verify', { challengeToken: 'token-register-new' });
    assert(res5.statusCode === 200, 'New user verification returns 200');
    assert(res5.body.access_token === 'pharos_access_token_new_user_session', 'Access token is correctly mapped');

    // Test 6: Registration conflict for existing user
    const res6 = await postRequest('/auth/register/options', { username: 'existing@iamrichardd.com' });
    assert(res6.statusCode === 409, 'Registration conflict returns 409');
    assert(res6.body.error === 'user_already_exists', 'Error payload reports user_already_exists');

    console.log('\n🎉 ALL MOCK AUTH SIMULATOR TESTS PASSED.');
    server.close(() => {
      process.exit(0);
    });
  } catch (error) {
    console.error(`\n❌ TEST FAILURE:`, error.message);
    server.close(() => {
      process.exit(1);
    });
  }
};

runTests();
