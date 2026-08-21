/**
 * tests/unit/logic/find-in-page.test.js
 * Unit testing for Find in Page (Ctrl+F) formatting, counter state, and navigation logic
 */

const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Level 1: Find in Page (Ctrl+F) Logic & Counter Tests', () => {

  // Load formatting logic from js/tools.js
  let formatMatchCounter;

  before(() => {
    const toolsCode = fs.readFileSync(path.join(__dirname, '../../../js/tools.js'), 'utf8');

    // Extract formatMatchCounter function
    const fn = new Function(`
      ${toolsCode};
      return { formatMatchCounter };
    `);

    // Minimal dummy DOM elements to allow tools.js evaluation without errors
    global.Storage = { get: () => null, set: () => {} };
    global.window = {};
    global.document = {
      getElementById: () => null,
      querySelectorAll: () => []
    };

    const exported = fn();
    formatMatchCounter = exported.formatMatchCounter;
  });

  describe('formatMatchCounter', () => {
    test('should return neutral 0/0 when query is empty', () => {
      assert.deepEqual(formatMatchCounter(0, 0, ''), { text: '0/0', className: '', isNoMatches: false, isHasMatches: false });
      assert.deepEqual(formatMatchCounter(1, 1, '   '), { text: '0/0', className: '', isNoMatches: false, isHasMatches: false });
      assert.deepEqual(formatMatchCounter(0, 0, null), { text: '0/0', className: '', isNoMatches: false, isHasMatches: false });
    });

    test('should return no-matches class and red warning flag when query has 0 matches', () => {
      const res = formatMatchCounter(0, 0, 'nonexistent');
      assert.equal(res.text, '0/0');
      assert.equal(res.className, 'no-matches');
      assert.equal(res.isNoMatches, true);
      assert.equal(res.isHasMatches, false);
    });

    test('should format 1/1 accurately for single match with has-matches flag', () => {
      const res = formatMatchCounter(1, 1, '260821V90D751K');
      assert.equal(res.text, '1/1');
      assert.equal(res.className, 'has-matches');
      assert.equal(res.isNoMatches, false);
      assert.equal(res.isHasMatches, true);
    });

    test('should format multi-match index (e.g. 2/5) with has-matches class', () => {
      const res = formatMatchCounter(2, 5, 'pesanan');
      assert.equal(res.text, '2/5');
      assert.equal(res.className, 'has-matches');
      assert.equal(res.isNoMatches, false);
      assert.equal(res.isHasMatches, true);
    });

    test('should handle invalid/undefined arguments gracefully', () => {
      const res = formatMatchCounter(undefined, null, 'order');
      assert.equal(res.text, '0/0');
      assert.equal(res.className, 'no-matches');
      assert.equal(res.isNoMatches, true);
    });
  });

});
