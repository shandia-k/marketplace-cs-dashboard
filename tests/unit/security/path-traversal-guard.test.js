/**
 * tests/unit/security/path-traversal-guard.test.js
 * Security testing for Path Traversal Defense and Partition Sanitization
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { isValidPartition, getStoresFilePath } = require('../../../src/main/services/storage.service');

describe('Level 2: Security & Path Traversal Guard Tests', () => {
  describe('isValidPartition', () => {
    test('should validate standard well-formed partition strings', () => {
      assert.equal(isValidPartition('persist:shopee-1'), true);
      assert.equal(isValidPartition('persist:user_budi_store_2'), true);
      assert.equal(isValidPartition('persist:tokopedia_official_store_99'), true);
    });

    test('should REJECT path traversal attempts in partition names', () => {
      assert.equal(isValidPartition('persist:../../Windows'), false);
      assert.equal(isValidPartition('persist:../AppData'), false);
      assert.equal(isValidPartition('persist:foo/bar'), false);
      assert.equal(isValidPartition('persist:foo\\bar'), false);
    });

    test('should REJECT partitions with invalid characters or missing persist prefix', () => {
      assert.equal(isValidPartition('temp:shopee-1'), false);
      assert.equal(isValidPartition('persist:'), false);
      assert.equal(isValidPartition('persist:<script>'), false);
      assert.equal(isValidPartition('persist:store*'), false);
      assert.equal(isValidPartition(null), false);
      assert.equal(isValidPartition(''), false);
    });

    test('should REJECT overly long partition strings (> 120 chars)', () => {
      const longPart = 'persist:' + 'a'.repeat(200);
      assert.equal(isValidPartition(longPart), false);
    });
  });

  describe('getStoresFilePath (Username Path Sanitization)', () => {
    test('should return stores.json for empty or null username', () => {
      const filePath = getStoresFilePath(null);
      assert.ok(filePath.endsWith('stores.json'));
    });

    test('should sanitize malicious username containing path traversal chars', () => {
      const filePath = getStoresFilePath('../../Windows/System32');
      // Must not escape parent directory
      const baseName = path.basename(filePath);
      assert.ok(baseName.startsWith('stores_'));
      assert.ok(!baseName.includes('/'));
      assert.ok(!baseName.includes('\\'));
      assert.ok(!baseName.includes('..'));
    });

    test('should sanitize special characters (?, %, *, :, |, ", <, >)', () => {
      const filePath = getStoresFilePath('user:name*with?bad<chars>');
      const baseName = path.basename(filePath);
      assert.ok(!/[?%*:|"<>]/g.test(baseName));
    });
  });
});
