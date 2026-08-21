/**
 * tests/unit/logic/config.test.js
 * Unit testing for configuration constants in js/config.js and src/main/config/constants.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox } = require('../../helpers/dom-sandbox');

describe('Level 1: Configuration Tests (js/config.js & constants.js)', () => {
  test('should load all required marketplaces in MARKETPLACE_CONFIG with valid properties', () => {
    const sandbox = createDOMSandbox();
    const configCode = fs.readFileSync(path.join(__dirname, '../../../js/config.js'), 'utf8');
    const fn = new Function('window', configCode);
    fn(sandbox.window);

    const cfg = sandbox.window.MARKETPLACE_CONFIG;
    assert.ok(cfg, 'MARKETPLACE_CONFIG should be defined');

    const expectedMarketplaces = ['shopee', 'tokopedia', 'lazada', 'tiktok', 'blibli', 'bukalapak', 'whatsapp'];
    expectedMarketplaces.forEach(mp => {
      assert.ok(cfg[mp], `Marketplace ${mp} must be configured`);
      assert.ok(cfg[mp].label, `Marketplace ${mp} must have a label`);
      assert.ok(cfg[mp].emoji, `Marketplace ${mp} must have an emoji`);
      assert.ok(cfg[mp].groupColor, `Marketplace ${mp} must have a group color`);
      if (mp !== 'custom') {
        assert.ok(cfg[mp].url.startsWith('https://'), `Marketplace ${mp} URL must use https`);
      }
    });
  });

  test('should have valid smart template templates with distinct IDs and categories', () => {
    const sandbox = createDOMSandbox();
    const configCode = fs.readFileSync(path.join(__dirname, '../../../js/config.js'), 'utf8');
    const fn = new Function('window', configCode);
    fn(sandbox.window);

    const templates = sandbox.window.DEFAULT_SMART_TEMPLATES;
    assert.ok(Array.isArray(templates));
    assert.ok(templates.length >= 5);

    const ids = new Set();
    templates.forEach(tpl => {
      assert.ok(tpl.id, 'Template must have an ID');
      assert.ok(!ids.has(tpl.id), `Template ID "${tpl.id}" must be unique`);
      ids.add(tpl.id);
      assert.ok(tpl.title, 'Template must have a title');
      assert.ok(tpl.content, 'Template must have content');
      assert.ok(tpl.category, 'Template must have a category');
    });
  });

  test('should define valid RAM hibernation limits and intervals', () => {
    const sandbox = createDOMSandbox();
    const configCode = fs.readFileSync(path.join(__dirname, '../../../js/config.js'), 'utf8');
    const fn = new Function('window', configCode);
    fn(sandbox.window);

    assert.equal(typeof sandbox.window.RAM_THRESHOLD_MB, 'number');
    assert.ok(sandbox.window.RAM_THRESHOLD_MB >= 1024, 'Threshold should be at least 1GB');
    assert.ok(sandbox.window.RAM_CHECK_INTERVAL_MS >= 1000, 'Interval should be at least 1s');
  });

  test('should define valid User-Agent constants in src/main/config/constants.js', () => {
    const constants = require('../../../src/main/config/constants');
    assert.ok(constants.cleanChromeUserAgent.includes('Chrome/'), 'Chrome UA must be valid');
    assert.ok(constants.cleanFirefoxUserAgent.includes('Firefox/'), 'Firefox UA must be valid');
    assert.ok(!constants.cleanChromeUserAgent.includes('Electron'), 'Stealth UA must NOT include Electron');
    assert.ok(!constants.cleanFirefoxUserAgent.includes('Electron'), 'Stealth Firefox UA must NOT include Electron');
  });
});
