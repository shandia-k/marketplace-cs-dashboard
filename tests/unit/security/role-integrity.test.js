/**
 * tests/unit/security/role-integrity.test.js
 * Security testing for Cryptographic Role HMAC Signature and Tampering Prevention
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { computeRoleSig, verifyUserRoleSig } = require('../../../src/main/services/storage.service');

describe('Level 2: Security & RBAC Integrity Tests (HMAC Role Signatures)', () => {
  test('should generate consistent role signature for given user, role, and salt', () => {
    const sig1 = computeRoleSig('cs_budi', 'Customer Service', 'salt12345');
    const sig2 = computeRoleSig('cs_budi', 'Customer Service', 'salt12345');
    assert.equal(typeof sig1, 'string');
    assert.equal(sig1.length, 64);
    assert.equal(sig1, sig2);
  });

  test('should normalize username case when computing role signature', () => {
    const sigLower = computeRoleSig('user_andi', 'Customer Service', 'salt123');
    const sigUpper = computeRoleSig('USER_ANDI', 'Customer Service', 'salt123');
    assert.equal(sigLower, sigUpper);
  });

  test('should verify valid user role signature successfully', () => {
    const user = {
      username: 'cs_sarah',
      role: 'Customer Service',
      passwordSalt: 'abcdef1234567890'
    };
    user.roleSig = computeRoleSig(user.username, user.role, user.passwordSalt);
    assert.equal(verifyUserRoleSig(user), true);
  });

  test('should REJECT unauthorized privilege escalation attempt (tampered role in JSON)', () => {
    // Attacker changed role to "Super Admin" in users.json without recomputing valid HMAC
    const legitimateUser = {
      username: 'cs_bad_actor',
      role: 'Customer Service',
      passwordSalt: 'salt777888'
    };
    legitimateUser.roleSig = computeRoleSig(legitimateUser.username, legitimateUser.role, legitimateUser.passwordSalt);

    // Tampering: Attacker changes role to Super Admin in memory / file
    const tamperedUser = {
      ...legitimateUser,
      role: 'Super Admin',
      isSuperAdmin: true
    };

    assert.equal(
      verifyUserRoleSig(tamperedUser),
      false,
      'Tampered user role MUST fail signature verification'
    );
  });

  test('should reject user object with missing or null role signature', () => {
    const userNoSig = {
      username: 'cs_joko',
      role: 'Super Admin',
      passwordSalt: 'salt123'
    };
    assert.equal(verifyUserRoleSig(userNoSig), false);
    assert.equal(verifyUserRoleSig(null), false);
    assert.equal(verifyUserRoleSig({}), false);
  });

  test('should provide dynamic machine-bound secret without static code salt', () => {
    const { getRoleIntegritySecret } = require('../../../src/main/services/storage.service');
    const secret = getRoleIntegritySecret();
    assert.equal(typeof secret, 'string');
    assert.ok(secret.length >= 32, 'Secret must be at least 256-bit');
  });

  test('should seamlessly auto-migrate legacy role signatures to dynamic machine secret', () => {
    const legacySecret = 'cs_marketplace_role_hmac_secret_v2_99a8b7c6';
    const legacySig = crypto.createHmac('sha256', legacySecret).update('user_migrasi:Super Admin:salt999', 'utf8').digest('hex');

    const legacyUser = {
      username: 'user_migrasi',
      role: 'Super Admin',
      passwordSalt: 'salt999',
      roleSig: legacySig
    };

    assert.equal(verifyUserRoleSig(legacyUser), true, 'Legacy roleSig must pass migration verification');
    // Signature harus ter-upgrade ke signature dynamic baru
    const newExpected = computeRoleSig(legacyUser.username, legacyUser.role, legacyUser.passwordSalt);
    assert.equal(legacyUser.roleSig, newExpected, 'roleSig must be migrated in-place to dynamic machine key');
  });
});
