/**
 * tests/unit/logic/tools-calculators.test.js
 * Unit testing for CS Toolkit functions (phone cleaner, case converter, whitespace cleaner)
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox } = require('../../helpers/dom-sandbox');

describe('Level 1: Logic & CS Toolkit Tests (js/tools.js)', () => {
  let sandbox;
  let toolsContext;

  beforeEach(() => {
    sandbox = createDOMSandbox();
    const toolsCode = fs.readFileSync(path.join(__dirname, '../../../js/tools.js'), 'utf8');
    
    const fn = new Function('window', 'document', 'localStorage', 'Storage', `${toolsCode}; return {
      cleanIndonesianPhone,
      formatIndonesianPhoneDisplay,
      toTitleCase,
      toSentenceCase,
      cleanExtraSpaces
    };`);

    toolsContext = fn(sandbox.window, sandbox.document, sandbox.localStorage, {
      get: () => [],
      set: () => {}
    });
  });

  describe('cleanIndonesianPhone', () => {
    test('should normalize +62 prefix to 62', () => {
      assert.equal(toolsContext.cleanIndonesianPhone('+6281234567890'), '6281234567890');
    });

    test('should normalize 08 prefix to 628', () => {
      assert.equal(toolsContext.cleanIndonesianPhone('0812-3456-7890'), '6281234567890');
    });

    test('should normalize 8 prefix to 628', () => {
      assert.equal(toolsContext.cleanIndonesianPhone('81234567890'), '6281234567890');
    });

    test('should strip non-numeric characters and spaces', () => {
      assert.equal(toolsContext.cleanIndonesianPhone('(0812) 345 6789'), '628123456789');
    });

    test('should return empty string for null, undefined, or empty', () => {
      assert.equal(toolsContext.cleanIndonesianPhone(''), '');
      assert.equal(toolsContext.cleanIndonesianPhone(null), '');
    });
  });

  describe('formatIndonesianPhoneDisplay', () => {
    test('should format clean 628 phone to readable spaced display', () => {
      const formatted = toolsContext.formatIndonesianPhoneDisplay('6281234567890');
      assert.equal(formatted, '+62 812-3456-7890');
    });

    test('should return "+62 -" for too short or invalid numbers', () => {
      assert.equal(toolsContext.formatIndonesianPhoneDisplay('123'), '+62 -');
      assert.equal(toolsContext.formatIndonesianPhoneDisplay(''), '+62 -');
    });
  });

  describe('toTitleCase', () => {
    test('should capitalize each word and preserve Indonesian abbreviations', () => {
      const text = 'jl. raya kebon jeruk no. 12 blok b ii cod jne jakarta barat';
      const result = toolsContext.toTitleCase(text);
      assert.ok(result.includes('JL.'));
      assert.ok(result.includes('NO.'));
      assert.ok(result.includes('BLOK'));
      assert.ok(result.includes('II'));
      assert.ok(result.includes('COD'));
      assert.ok(result.includes('JNE'));
      assert.ok(result.includes('Jakarta'));
      assert.ok(result.includes('Barat'));
    });
  });

  describe('toSentenceCase', () => {
    test('should capitalize first letter of sentences', () => {
      const text = 'halo kak. pesanan sudah dikirim! mohon ditunggu ya? terima kasih.';
      const result = toolsContext.toSentenceCase(text);
      assert.equal(result, 'Halo kak. Pesanan sudah dikirim! Mohon ditunggu ya? Terima kasih.');
    });
  });

  describe('cleanExtraSpaces', () => {
    test('should clean multiple spaces and consecutive blank lines', () => {
      const raw = 'Halo    kak,    pesanan   anda\n\n\n\nsudah   kami   proses.';
      const result = toolsContext.cleanExtraSpaces(raw);
      assert.equal(result, 'Halo kak, pesanan anda\n\nsudah kami proses.');
    });
  });
});
