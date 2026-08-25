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
  const effectiveSalt = salt || generateSalt();
  return crypto.scryptSync(password, effectiveSalt, 32).toString('hex');
}

function verifyPassword(password, storedHash, storedSalt) {
  if (!password || !storedHash || !storedSalt) return false;
  try {
    const computed = hashPassword(password, storedSalt);
    const computedBuf = Buffer.from(computed, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch (e) {
    return false;
  }
}

// AES-256-GCM Vault logic
const VAULT_PREFIX = 'enc:v1:';
function encryptVaultPass(raw, host = 'seller.shopee.co.id') {
  if (!raw) return '';
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync('cs_mkt_vault_partition_k99_' + host, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(raw, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${VAULT_PREFIX}${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decryptVaultPass(enc, host = 'seller.shopee.co.id') {
  if (!enc) return '';
  if (typeof enc === 'string' && enc.startsWith(VAULT_PREFIX)) {
    const parts = enc.slice(VAULT_PREFIX.length).split(':');
    if (parts.length === 4) {
      const [saltHex, ivHex, tagHex, cipherHex] = parts;
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const key = crypto.scryptSync('cs_mkt_vault_partition_k99_' + host, salt, 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  }
  return Buffer.from(enc, 'base64').toString('utf8');
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

  test('should strictly REJECT unsalted legacy password hashes (Zero-Unsalted Policy)', () => {
    const legacyHash = crypto.createHash('sha256').update('legacyPass123').digest('hex');
    assert.equal(verifyPassword('legacyPass123', legacyHash, null), false, 'Unsalted hash with null salt must be rejected');
    assert.equal(verifyPassword('legacyPass123', legacyHash, undefined), false, 'Unsalted hash with undefined salt must be rejected');
    assert.equal(verifyPassword('legacyPass123', legacyHash, ''), false, 'Unsalted hash with empty salt must be rejected');
  });

  test('should encrypt and decrypt credentials with AES-256-GCM Vault', () => {
    const originalPass = 'S4ngatR4h4sia!@2026';
    const encrypted = encryptVaultPass(originalPass);
    assert.ok(encrypted.startsWith(VAULT_PREFIX), 'Encrypted string must have version prefix');
    assert.notEqual(encrypted, originalPass, 'Ciphertext must not be plaintext');
    assert.notEqual(encrypted, Buffer.from(originalPass).toString('base64'), 'Must not be plain Base64');

    const decrypted = decryptVaultPass(encrypted);
    assert.equal(decrypted, originalPass, 'Decrypted password must match original exactly');
  });

  test('should decrypt legacy Base64 stored credentials gracefully', () => {
    const legacyBase64 = Buffer.from('OldStorePassword123').toString('base64');
    const decrypted = decryptVaultPass(legacyBase64);
    assert.equal(decrypted, 'OldStorePassword123');
  });

  test('should encrypt and decrypt via vault.service.js with fallback/DPAPI support', () => {
    const vaultService = require('../../../src/main/services/vault.service');
    const secret = 'StoreAccountSecretPassword!2026';
    const encrypted = vaultService.encryptSecret(secret);
    assert.ok(typeof encrypted === 'string');
    assert.ok(encrypted.startsWith('dpapi:v1:') || encrypted.startsWith('enc:v1:'));
    assert.notEqual(encrypted, secret);

    const decrypted = vaultService.decryptSecret(encrypted);
    assert.equal(decrypted, secret);
  });
});

describe('Level 2: URL Rules & Centralized OAuth Detection Tests', () => {
  const urlRules = require('../../../src/main/config/url-rules');

  test('should accurately classify OAuth identity platform URLs', () => {
    assert.equal(urlRules.isOAuthUrl('https://accounts.google.com/o/oauth2/v2/auth?client_id=123&response_type=code'), true);
    assert.equal(urlRules.isOAuthUrl('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=abc'), true);
    assert.equal(urlRules.isOAuthUrl('https://appleid.apple.com/auth/authorize?client_id=app'), true);
    assert.equal(urlRules.isOAuthUrl('https://github.com/login/oauth/authorize?client_id=gh123'), true);
    assert.equal(urlRules.isOAuthUrl('https://www.facebook.com/v19.0/dialog/oauth?client_id=fb456&response_type=code'), true);
  });

  test('should NOT flag regular marketplace product / order URLs containing substring "auth"', () => {
    assert.equal(urlRules.isOAuthUrl('https://seller.shopee.co.id/portal/product/author_book'), false);
    assert.equal(urlRules.isOAuthUrl('https://seller.tokopedia.com/manage-order/authenticated'), false);
    assert.equal(urlRules.isOAuthUrl('https://seller.tiktok.com/order/detail?order_id=98765'), false);
  });

  test('should detect dangerous navigation protocols', () => {
    assert.equal(urlRules.isDangerousProtocol('javascript:alert(1)'), true);
    assert.equal(urlRules.isDangerousProtocol('file:///C:/Windows/System32/calc.exe'), true);
    assert.equal(urlRules.isDangerousProtocol('vbscript:msgbox'), true);
    assert.equal(urlRules.isDangerousProtocol('https://seller.shopee.co.id/'), false);
  });

  test('should allow safe standard document/webview protocols', () => {
    assert.equal(urlRules.isAllowedProtocol('https://seller.shopee.co.id/'), true);
    assert.equal(urlRules.isAllowedProtocol('http://localhost:3000/'), true);
    assert.equal(urlRules.isAllowedProtocol('blob:https://seller.shopee.co.id/1234-5678'), true);
    assert.equal(urlRules.isAllowedProtocol('data:image/png;base64,iVBORw0KGgo='), true);
    assert.equal(urlRules.isAllowedProtocol('about:blank'), true);
    assert.equal(urlRules.isAllowedProtocol('file:///etc/passwd'), false);
  });
});
