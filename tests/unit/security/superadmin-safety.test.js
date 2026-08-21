/**
 * tests/unit/security/superadmin-safety.test.js
 * Security testing for Super Admin preservation and zero-lockout guarantees
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { isUserSuperAdmin, computeRoleSig } = require('../../../src/main/services/storage.service');

describe('Level 2: Security & Super Admin Safety Tests', () => {
  test('should recognize hardcoded superadmin account as Super Admin regardless of case', () => {
    assert.equal(isUserSuperAdmin({ username: 'superadmin' }), true);
    assert.equal(isUserSuperAdmin({ username: 'SuperAdmin' }), true);
    assert.equal(isUserSuperAdmin({ username: 'SUPERADMIN' }), true);
  });

  test('should recognize verified Super Admin role object', () => {
    const adminUser = {
      username: 'owner_utama',
      role: 'Super Admin',
      isSuperAdmin: true
    };
    assert.equal(isUserSuperAdmin(adminUser), true);
  });

  test('should return false for regular Customer Service users', () => {
    const csUser = {
      username: 'cs_staff1',
      role: 'Customer Service',
      isSuperAdmin: false
    };
    assert.equal(isUserSuperAdmin(csUser), false);
  });

  test('should return false if user object has conflicting role and isSuperAdmin flag', () => {
    const fake1 = { username: 'cs_fake', role: 'Super Admin', isSuperAdmin: false };
    const fake2 = { username: 'cs_fake2', role: 'Customer Service', isSuperAdmin: true };
    assert.equal(isUserSuperAdmin(fake1), false);
    assert.equal(isUserSuperAdmin(fake2), false);
  });

  test('should handle null/undefined user objects safely', () => {
    assert.equal(isUserSuperAdmin(null), false);
    assert.equal(isUserSuperAdmin(undefined), false);
    assert.equal(isUserSuperAdmin('superadmin'), false); // not an object
  });
});
