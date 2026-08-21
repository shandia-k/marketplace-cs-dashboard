/**
 * tests/unit/security/auth-crypto.test.js
 * Security & Cryptography unit testing: password hashing, salts, timing-safe verification
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Functions extracted directly from auth service design
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  if (!password) return '';
  if (!salt) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function verifyPassword(password, storedHash, storedSalt) {
  if (!password || !storedHash) return false;
  try {
    if (storedSalt) {
      const computed = hashPassword(password, storedSalt);
      return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
    }
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    if (legacyHash.length === storedHash.length) {
      return crypto.timingSafeEqual(Buffer.from(legacyHash, 'hex'), Buffer.from(storedHash, 'hex'));
    }
    return legacyHash === storedHash;
  } catch (e) {
    return false;
  }
}

describe('Level 2: Security & Cryptography Tests (Password & Hashing)', () => {
  test('should generate a 32-character hexadecimal salt', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    assert.equal(typeof salt1, 'string');
    assert.equal(salt1.length, 32);
    assert.notEqual(salt1, salt2, 'Salts must be cryptographically unique');
  });

  test('should hash passwords using Scrypt when salt is provided', () => {
    const salt = generateSalt();
    const hash = hashPassword('MySecretPass@2026', salt);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64); // 32 bytes hex = 64 chars
  });

  test('should produce different hashes for identical passwords with different salts (rainbow table defense)', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const hash1 = hashPassword('SamePassword123', salt1);
    const hash2 = hashPassword('SamePassword123', salt2);
    assert.notEqual(hash1, hash2);
  });

  test('should verify correct password using timing-safe comparison', () => {
    const salt = generateSalt();
    const hash = hashPassword('CorrectPassword123', salt);
    assert.equal(verifyPassword('CorrectPassword123', hash, salt), true);
  });

  test('should reject wrong password without throwing exceptions', () => {
    const salt = generateSalt();
    const hash = hashPassword('CorrectPassword123', salt);
    assert.equal(verifyPassword('WrongPassword999', hash, salt), false);
    assert.equal(verifyPassword('', hash, salt), false);
    assert.equal(verifyPassword(null, hash, salt), false);
  });

  test('should verify legacy unsalted SHA-256 passwords for backward compatibility', () => {
    const legacyHash = crypto.createHash('sha256').update('legacyPass123').digest('hex');
    assert.equal(verifyPassword('legacyPass123', legacyHash, null), true);
    assert.equal(verifyPassword('wrongLegacy', legacyHash, null), false);
  });
});
