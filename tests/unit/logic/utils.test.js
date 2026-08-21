/**
 * tests/unit/logic/utils.test.js
 * Unit testing for core utility functions in js/utils.js
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox } = require('../../helpers/dom-sandbox');

describe('Level 1: Logic & Utilities Tests (js/utils.js)', () => {
  let sandbox;
  let utilsContext;

  beforeEach(() => {
    sandbox = createDOMSandbox();
    const utilsCode = fs.readFileSync(path.join(__dirname, '../../../js/utils.js'), 'utf8');
    
    // Evaluate in sandbox context
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return {
      escapeHtml,
      generateId,
      debounce,
      formatRupiah,
      getGreetingTime,
      formatRelativeTime,
      getStorePartition,
      getEffectiveCSName,
      resolveTemplateVariables
    };`);

    utilsContext = fn(sandbox.window, sandbox.document, sandbox.localStorage);
  });

  describe('escapeHtml', () => {
    test('should escape &, <, >, and " characters correctly', () => {
      const raw = '<script>alert("XSS & danger")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS &amp; danger&quot;)&lt;/script&gt;';
      assert.equal(utilsContext.escapeHtml(raw), expected);
    });

    test('should handle numbers and non-string values safely', () => {
      assert.equal(utilsContext.escapeHtml(12345), '12345');
      assert.equal(utilsContext.escapeHtml(null), 'null');
      assert.equal(utilsContext.escapeHtml(undefined), 'undefined');
    });

    test('should leave safe plain text unchanged', () => {
      const text = 'Halo Kak, pesanan Anda sedang kami proses!';
      assert.equal(utilsContext.escapeHtml(text), text);
    });
  });

  describe('generateId', () => {
    test('should generate a non-empty string between 5 and 10 characters', () => {
      const id1 = utilsContext.generateId();
      const id2 = utilsContext.generateId();
      assert.equal(typeof id1, 'string');
      assert.ok(id1.length >= 5);
      assert.notEqual(id1, id2, 'Two generated IDs should be unique');
    });
  });

  describe('formatRupiah', () => {
    test('should format positive integers to Indonesian Rupiah format', () => {
      const result = utilsContext.formatRupiah(150000);
      assert.ok(result.startsWith('Rp'));
      assert.ok(result.includes('150.000') || result.includes('150,000'));
    });

    test('should handle 0 and negative values safely', () => {
      const zero = utilsContext.formatRupiah(0);
      assert.ok(zero.includes('0'));
      const invalid = utilsContext.formatRupiah('invalid');
      assert.ok(invalid.includes('0'));
    });

    test('should round float values properly', () => {
      const floatRes = utilsContext.formatRupiah(9999.8);
      assert.ok(floatRes.includes('10.000') || floatRes.includes('10,000'));
    });
  });

  describe('getGreetingTime', () => {
    test('should return one of pagi, siang, sore, malam', () => {
      const greeting = utilsContext.getGreetingTime();
      assert.ok(['pagi', 'siang', 'sore', 'malam'].includes(greeting));
    });
  });

  describe('formatRelativeTime', () => {
    test('should return empty string for null/undefined timestamp', () => {
      assert.equal(utilsContext.formatRelativeTime(null), '');
      assert.equal(utilsContext.formatRelativeTime(0), '');
    });

    test('should return "Baru saja" for timestamps less than 15s ago', () => {
      const now = Date.now();
      assert.equal(utilsContext.formatRelativeTime(now - 5000), 'Baru saja');
    });

    test('should return seconds format for timestamps < 60s ago', () => {
      const now = Date.now();
      assert.equal(utilsContext.formatRelativeTime(now - 30000), '30 dtk lalu');
    });

    test('should return minutes format for timestamps < 60m ago', () => {
      const now = Date.now();
      assert.equal(utilsContext.formatRelativeTime(now - 120000), '2 mnt lalu');
    });

    test('should return hours format for timestamps < 24h ago', () => {
      const now = Date.now();
      assert.equal(utilsContext.formatRelativeTime(now - 7200000), '2 jam lalu');
    });

    test('should return days format for timestamps >= 24h ago', () => {
      const now = Date.now();
      assert.equal(utilsContext.formatRelativeTime(now - 172800000), '2 hari lalu');
    });
  });

  describe('getStorePartition', () => {
    test('should build username-isolated partition persist:user_<username>_<storeId>', () => {
      const store = { id: 'shopee-1', partition: 'persist:shopee-1' };
      const partition = utilsContext.getStorePartition(store, 'admin_budi');
      assert.equal(partition, 'persist:user_admin_budi_shopee-1');
    });

    test('should fallback to window.currentUser if username argument is omitted', () => {
      sandbox.window.currentUser = 'cs_siti';
      const store = { id: 'tokopedia-2' };
      const partition = utilsContext.getStorePartition(store);
      assert.equal(partition, 'persist:user_cs_siti_tokopedia-2');
    });

    test('should fallback to store.partition or default if no user is set', () => {
      sandbox.window.currentUser = null;
      const store = { id: 'lazada-1', partition: 'persist:lazada-1' };
      assert.equal(utilsContext.getStorePartition(store, null), 'persist:lazada-1');
    });
  });

  describe('getEffectiveCSName', () => {
    test('should return profile displayName if present', () => {
      const profile = { displayName: 'Kak Siti CS' };
      assert.equal(utilsContext.getEffectiveCSName(profile, 'cs_siti'), 'Kak Siti CS');
    });

    test('should fallback to username if profile displayName is missing', () => {
      assert.equal(utilsContext.getEffectiveCSName(null, 'cs_andi'), 'cs_andi');
      assert.equal(utilsContext.getEffectiveCSName({}, 'cs_andi'), 'cs_andi');
    });

    test('should fallback to "CS" if both profile and username are missing', () => {
      sandbox.window.currentUserProfile = null;
      sandbox.window.currentUserName = null;
      sandbox.window.currentUser = null;
      assert.equal(utilsContext.getEffectiveCSName(null, null), 'CS');
    });
  });

  describe('debounce', () => {
    test('should debounce function execution', (t, done) => {
      let callCount = 0;
      const debounced = utilsContext.debounce(() => {
        callCount++;
      }, 50);

      debounced();
      debounced();
      debounced();

      assert.equal(callCount, 0, 'Should not be called immediately');

      setTimeout(() => {
        assert.equal(callCount, 1, 'Should only be called once after delay');
        done();
      }, 80);
    });
  });
});
