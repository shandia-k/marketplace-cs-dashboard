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

  test('should expose clean window.App.State module interface', () => {
    const stateCode = fs.readFileSync(path.join(__dirname, '../../../js/state.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${stateCode}; return window.App;`);
    const appNamespace = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    assert.ok(appNamespace, 'window.App must be defined');
    assert.ok(appNamespace.State, 'window.App.State must be defined');
    assert.equal(typeof appNamespace.State.getStores, 'function');
    assert.equal(typeof appNamespace.State.getActiveStoreId, 'function');
    assert.equal(typeof appNamespace.State.getStoreTabs, 'function');
    assert.equal(typeof appNamespace.State.subscribe, 'function');
    assert.equal(typeof appNamespace.State.dispatch, 'function');
  });

  test('should dispatch events and notify subscribers in reactive state store', () => {
    const stateCode = fs.readFileSync(path.join(__dirname, '../../../js/state.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${stateCode}; return window.App.State;`);
    const state = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    let storeActivatedPayload = null;
    const unsub = state.subscribe('STORE_ACTIVATED', (payload) => {
      storeActivatedPayload = payload;
    });

    state.dispatch('STORE_ACTIVATED', { storeId: 'shopee-123' });
    assert.deepEqual(storeActivatedPayload, { storeId: 'shopee-123' });
    assert.equal(state.getActiveStoreId(), 'shopee-123');

    // Test unsubscribe
    unsub();
    state.dispatch('STORE_ACTIVATED', { storeId: 'tokopedia-456' });
    assert.deepEqual(storeActivatedPayload, { storeId: 'shopee-123' }, 'Callback must not be invoked after unsubscribe');
    assert.equal(state.getActiveStoreId(), 'tokopedia-456', 'State must still be updated by dispatch');
  });
});
