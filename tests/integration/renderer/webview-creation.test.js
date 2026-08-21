const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Level 5: Webview Creation Runtime Safety Tests', () => {
  test('should execute createWebview without any ReferenceError or undefined variable crashes', () => {
    const webviewCode = fs.readFileSync(path.join(__dirname, '../../../js/webview.js'), 'utf8');

    // Setup DOM environment mock
    const createdElements = [];
    const mockDocument = {
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          className: '',
          classList: {
            add: (cls) => { el.className += ' ' + cls; },
            remove: () => {},
            contains: () => false
          },
          attributes: {},
          setAttribute: (k, v) => { el.attributes[k] = v; },
          getAttribute: (k) => el.attributes[k],
          addEventListener: () => {},
          appendChild: (child) => { createdElements.push(child); },
          style: {}
        };
        return el;
      },
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => []
    };

    const mockWebviewCont = mockDocument.createElement('div');

    const configCode = fs.readFileSync(path.join(__dirname, '../../../js/config.js'), 'utf8');

    const sandbox = {
      document: mockDocument,
      window: { location: { href: 'http://localhost/' } },
      appPath: 'D:/antigravity/marketplace-cs-dashboard',
      webviewCont: mockWebviewCont,
      webviewMap: {},
      storeTabs: {},
      activeTabMap: { 'store-1': 'tab-1' },
      activeStoreId: 'store-1',
      lastAccessed: {},
      stores: [{ id: 'store-1', name: 'Google', url: 'https://google.com' }],
      getStorePartition: () => 'persist:test',
      escapeHtml: (s) => s,
      isValidTopNavigationUrl: () => true,
      parseUnreadFromTitle: () => 0,
      handleUnreadCount: () => {},
      updateNavButtonStates: () => {},
      updateAddressBarUrl: () => {},
      showZoomIndicator: () => {},
      openUrlInNewTab: () => {},
      debouncedSaveStoreTabsState: () => {},
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };

    vm.createContext(sandbox);
    vm.runInContext(configCode, sandbox);

    // Jalankan kode js/webview.js di dalam sandbox
    assert.doesNotThrow(() => {
      vm.runInContext(webviewCode, sandbox);
    }, 'Evaluating webview.js must not throw syntax or initialization errors');

    // Uji pemanggilan createWebview secara nyata
    assert.equal(typeof sandbox.createWebview, 'function', 'createWebview must be defined');

    const testStore = { id: 'store-1', name: 'Google', url: 'https://www.google.com' };
    const testTab = { id: 'tab-1', url: 'https://www.google.com' };

    assert.doesNotThrow(() => {
      sandbox.createWebview(testStore, testTab);
    }, 'createWebview must execute successfully without ReferenceError on cleanUa or any other variable');

    // Verifikasi bahwa elemen webview berhasil dibuat dengan useragent dan partition yang valid
    const wvEntry = sandbox.webviewMap['tab-1'];
    assert.ok(wvEntry, 'webviewMap must contain the created tab');
    assert.ok(wvEntry.webview, 'webviewMap entry must contain webview element');
    assert.ok(wvEntry.webview.attributes['useragent'], 'webview must have valid useragent attribute');
    assert.ok(wvEntry.webview.attributes['partition'], 'webview must have valid partition attribute');
  });
});
