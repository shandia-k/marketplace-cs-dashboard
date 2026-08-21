/**
 * tests/integration/renderer/state-management.test.js
 * Integration testing for renderer state management, stores, and tab maps
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox } = require('../../helpers/dom-sandbox');

describe('Level 5: Renderer State Management Tests (js/state.js)', () => {
  let sandbox;
  let stateContext;

  beforeEach(() => {
    sandbox = createDOMSandbox();
    const stateCode = fs.readFileSync(path.join(__dirname, '../../../js/state.js'), 'utf8');

    const fn = new Function('window', 'document', 'localStorage', `${stateCode}; return {
      storeTabs,
      activeTabMap,
      webviewMap,
      unreadMap,
      lastAccessed,
      currentTheme
    };`);

    stateContext = fn(sandbox.window, sandbox.document, sandbox.localStorage);
  });

  test('should initialize empty state maps for tabs, active tabs, webviews, and unread counts', () => {
    assert.deepEqual(stateContext.storeTabs, {});
    assert.deepEqual(stateContext.activeTabMap, {});
    assert.deepEqual(stateContext.webviewMap, {});
    assert.deepEqual(stateContext.unreadMap, {});
    assert.deepEqual(stateContext.lastAccessed, {});
  });

  test('should default to dark theme or read existing theme from localStorage', () => {
    assert.equal(stateContext.currentTheme, 'dark');

    // If localStorage has light theme
    sandbox.localStorage.setItem('theme', 'light');
    const stateCode = fs.readFileSync(path.join(__dirname, '../../../js/state.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${stateCode}; return currentTheme;`);
    const theme = fn(sandbox.window, sandbox.document, sandbox.localStorage);
    assert.equal(theme, 'light');
  });

  test('should allow tracking tabs per store and active tab mapping', () => {
    const storeId = 'shopee-store-1';
    stateContext.storeTabs[storeId] = [
      { id: 'tab-1', title: 'Chat Shopee', url: 'https://seller.shopee.co.id/', zoom: 100 }
    ];
    stateContext.activeTabMap[storeId] = 'tab-1';
    stateContext.unreadMap[storeId] = 5;

    assert.equal(stateContext.storeTabs[storeId].length, 1);
    assert.equal(stateContext.activeTabMap[storeId], 'tab-1');
    assert.equal(stateContext.unreadMap[storeId], 5);
  });
});
