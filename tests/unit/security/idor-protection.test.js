/**
 * tests/unit/security/idor-protection.test.js
 * Security testing for Insecure Direct Object Reference (IDOR) prevention
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// IDOR authorization guard logic mirroring register-ipc.js
function authorizeStoreSave(currentActiveSession, requestedUsername) {
  const cleanUsername = String(requestedUsername || '').trim();
  if (currentActiveSession && !currentActiveSession.isSuperAdmin && currentActiveSession.username.toLowerCase() !== cleanUsername.toLowerCase()) {
    return {
      allowed: false,
      reason: `Blocked unauthorized saveStores attempt by "${currentActiveSession.username}" for user "${cleanUsername}"`
    };
  }
  return { allowed: true };
}

describe('Level 2: Security & IDOR Authorization Tests', () => {
  test('should ALLOW CS user to save their own store configurations', () => {
    const session = { username: 'cs_sarah', isSuperAdmin: false };
    const auth = authorizeStoreSave(session, 'cs_sarah');
    assert.equal(auth.allowed, true);
  });

  test('should ALLOW CS user with different casing to save their own stores', () => {
    const session = { username: 'CS_SARAH', isSuperAdmin: false };
    const auth = authorizeStoreSave(session, 'cs_sarah');
    assert.equal(auth.allowed, true);
  });

  test('should BLOCK regular CS user attempting to modify another user stores (IDOR Attack)', () => {
    const session = { username: 'cs_attacker', isSuperAdmin: false };
    const auth = authorizeStoreSave(session, 'cs_victim');
    assert.equal(auth.allowed, false);
    assert.ok(auth.reason.includes('Blocked unauthorized'));
  });

  test('should ALLOW Super Admin to modify stores on behalf of any user', () => {
    const superAdminSession = { username: 'owner_boss', isSuperAdmin: true };
    const auth = authorizeStoreSave(superAdminSession, 'cs_staff_1');
    assert.equal(auth.allowed, true);
  });
});
