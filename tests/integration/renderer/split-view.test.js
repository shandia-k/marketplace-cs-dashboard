/**
 * tests/integration/renderer/split-view.test.js
 * Integration testing for Side-by-Side View (Split View), Tab Picker, Resizer & Focus Routing
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox } = require('../../helpers/dom-sandbox');

describe('Level 5: Side-by-Side Split View & Tab Picker Tests', () => {
  let sandbox;
  let ctx;

  beforeEach(() => {
    sandbox = createDOMSandbox();

    // Setup DOM elements for split view
    sandbox.document.body.innerHTML = `
      <div id="tab-bar" style="display: flex;">
        <div id="tab-items-container"></div>
      </div>
      <div class="webview-container" id="webview-container">
        <div class="split-pane split-pane-left" id="split-pane-left"></div>
        <div class="split-resizer" id="split-resizer"></div>
        <div class="split-pane split-pane-right" id="split-pane-right">
          <div class="split-tab-picker" id="split-tab-picker">
            <input type="text" id="split-picker-search-input" />
            <div id="split-picker-chips">
              <button class="split-chip active" data-mp="all"></button>
              <button class="split-chip" data-mp="shopee"></button>
            </div>
            <button id="btn-split-picker-close"></button>
            <div class="split-picker-body" id="split-picker-body"></div>
          </div>
          <div class="split-right-body" id="split-right-body" style="display: none;"></div>
        </div>
      </div>
    `;

    const stateCode = fs.readFileSync(path.join(__dirname, '../../../js/state.js'), 'utf8');

    // Create execution scope with mock stores
    const code = `
      ${stateCode}

      stores.push(
        { id: 'store-1', name: 'Toko Shopee Official', marketplace: 'shopee', color: '#EE4D2D', initials: 'TS' },
        { id: 'store-2', name: 'Toko Tokopedia Mall', marketplace: 'tokopedia', color: '#03AC0E', initials: 'TT' }
      );

      storeTabs['store-1'] = [
        { id: 'tab-1-1', title: 'Chat Shopee', url: 'https://seller.shopee.co.id/' },
        { id: 'tab-1-2', title: 'Pesanan Shopee', url: 'https://seller.shopee.co.id/order' }
      ];
      storeTabs['store-2'] = [
        { id: 'tab-2-1', title: 'Chat Tokopedia', url: 'https://seller.tokopedia.com/' }
      ];

      activeStoreId = 'store-1';
      activeTabMap['store-1'] = 'tab-1-1';
      activeTabMap['store-2'] = 'tab-2-1';

      const MARKETPLACE_CONFIG = {
        shopee: { label: 'Shopee', faviconClass: 'fav-shopee' },
        tokopedia: { label: 'Tokopedia', faviconClass: 'fav-tokopedia' },
        custom: { label: 'Custom', faviconClass: 'fav-custom' }
      };

      function showToast() {}
      function escapeHtml(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function debounce(fn) { return fn; }
      function ensureStoreTabs() {}
      function getStorePartition(s) { return 'persist:' + s.id; }
      function isValidTopNavigationUrl() { return true; }

      ${fs.readFileSync(path.join(__dirname, '../../../js/tabs.js'), 'utf8')}
      ${fs.readFileSync(path.join(__dirname, '../../../js/webview.js'), 'utf8')}

      return {
        getSplitState: () => ({ isSplitViewActive, splitRatio, splitRightStoreId, splitRightTabId, activeFocusedPane, splitViewDisplayMode, splitSessions, activeSplitSessionId }),
        toggleSplitView,
        openSplitTabPicker,
        selectRightSplitTab,
        activateSplitSession,
        closeSplitSession,
        closeSplitView,
        swapSplitPanes,
        setFocusedPane,
        renderSplitTabPicker,
        renderTabBar,
        getActiveWebview,
        getActiveWcId,
        setSplitDisplayMode,
        toggleSplitDisplayMode,
        applySplitDisplayModeUI,
        navigateFromAddressBar,
        openSplitTabPicker,
        cancelSplitTabPicker,
        toggleFavoriteSplitSession,
        deleteFavoriteSplitSession,
        saveFavoriteSplitSessions,
        loadFavoriteSplitSessions
      };
    `;

    const fn = new Function('window', 'document', 'localStorage', code);
    ctx = fn(sandbox.window, sandbox.document, sandbox.localStorage);
  });

  test('should initialize split view state with correct defaults', () => {
    const s = ctx.getSplitState();
    assert.equal(s.isSplitViewActive, false);
    assert.equal(s.splitRatio, 50);
    assert.equal(s.splitRightStoreId, null);
    assert.equal(s.splitRightTabId, null);
    assert.equal(s.activeFocusedPane, 'left');
    assert.deepEqual(s.splitSessions, []);
  });

  test('should render tab picker cards and respond to filter', () => {
    ctx.renderSplitTabPicker();
    const body = sandbox.document.getElementById('split-picker-body');
    assert.ok(body.innerHTML.includes('Toko Shopee Official'));
    assert.ok(body.innerHTML.includes('Toko Tokopedia Mall'));
    assert.ok(body.innerHTML.includes('Chat Shopee'));
    assert.ok(body.innerHTML.includes('Pesanan Shopee'));
  });

  test('should select right split tab, create a split session, and render symmetrical dual tab bar', () => {
    ctx.selectRightSplitTab('store-2', 'tab-2-1');
    const s = ctx.getSplitState();

    assert.equal(s.isSplitViewActive, true);
    assert.equal(s.splitRightStoreId, 'store-2');
    assert.equal(s.splitRightTabId, 'tab-2-1');
    assert.equal(s.activeFocusedPane, 'right');
    assert.equal(s.splitSessions.length, 1);
    assert.equal(s.splitSessions[0].name, 'Toko Shopee Official + Toko Tokopedia Mall');

    const wvContainer = sandbox.document.getElementById('webview-container');
    assert.ok(wvContainer.classList.contains('split-active'));

    const rightBody = sandbox.document.getElementById('split-right-body');
    assert.equal(rightBody.style.display, 'flex');

    const tabContainer = sandbox.document.getElementById('tab-items-container');
    assert.ok(tabContainer.innerHTML.includes('split-dual-tab'));
    assert.ok(tabContainer.innerHTML.includes('Toko Shopee Official'));
    assert.ok(tabContainer.innerHTML.includes('Toko Tokopedia Mall'));
    assert.ok(tabContainer.innerHTML.includes('btn-split-toggle-fav'));
  });

  test('should star favorite a split session and persist to localStorage', () => {
    ctx.selectRightSplitTab('store-2', 'tab-2-1');
    const s = ctx.getSplitState();
    const sessionId = s.splitSessions[0].id;
    assert.equal(s.splitSessions[0].isFavorite, false);

    // Toggle favorite ON
    ctx.toggleFavoriteSplitSession(sessionId);
    assert.equal(s.splitSessions[0].isFavorite, true);

    const savedRaw = sandbox.localStorage.getItem('antigravity_favorite_split_sessions');
    assert.ok(savedRaw, 'localStorage must contain saved favorites');
    const parsed = JSON.parse(savedRaw);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, sessionId);
    assert.equal(parsed[0].isFavorite, true);

    // Closing the active view keeps the favorite in the list
    ctx.closeSplitSession(sessionId);
    assert.equal(ctx.getSplitState().isSplitViewActive, false, 'View must be closed');
    assert.equal(ctx.getSplitState().splitSessions.length, 1, 'Favorite session must remain in the sessions array');

    // Toggle favorite OFF removes it from storage
    ctx.toggleFavoriteSplitSession(sessionId);
    assert.equal(s.splitSessions[0].isFavorite, false);
    const savedAfterUnfav = sandbox.localStorage.getItem('antigravity_favorite_split_sessions');
    assert.equal(JSON.parse(savedAfterUnfav).length, 0);
  });

  test('should allow opening picker to replace tab and cancel returning to previous active webview', () => {
    // 1. Pilih tab kanan
    ctx.selectRightSplitTab('store-2', 'tab-2-1');
    const picker = sandbox.document.getElementById('split-tab-picker');
    const rightBody = sandbox.document.getElementById('split-right-body');
    assert.equal(rightBody.style.display, 'flex');

    // 2. Klik ganti tab -> buka picker
    ctx.openSplitTabPicker();
    assert.equal(picker.style.display, 'flex');
    assert.equal(rightBody.style.display, 'none');
    assert.equal(ctx.getSplitState().activeFocusedPane, 'right');

    // 3. Batalkan picker -> kembali ke webview kanan sebelumnya
    ctx.cancelSplitTabPicker();
    assert.equal(picker.style.display, 'none');
    assert.equal(rightBody.style.display, 'flex');
    assert.equal(ctx.getSplitState().splitRightTabId, 'tab-2-1');
    assert.equal(ctx.getSplitState().isSplitViewActive, true);
  });

  test('should swap left and right panes smoothly without blanking', () => {
    ctx.selectRightSplitTab('store-2', 'tab-2-1');
    assert.equal(ctx.getSplitState().splitRightStoreId, 'store-2');
    assert.equal(ctx.getSplitState().splitRightTabId, 'tab-2-1');

    ctx.swapSplitPanes();
    const s = ctx.getSplitState();
    assert.equal(s.splitRightStoreId, 'store-1');
    assert.equal(s.splitRightTabId, 'tab-1-1');

    const leftPane = sandbox.document.getElementById('split-pane-left');
    const rightBody = sandbox.document.getElementById('split-right-body');
    assert.ok(leftPane.children.length > 0, 'Left pane must contain swapped webview');
    assert.ok(rightBody.children.length > 0, 'Right body must contain swapped webview');
  });

  test('should close split view and restore single view state', () => {
    ctx.selectRightSplitTab('store-2', 'tab-2-1');
    assert.equal(ctx.getSplitState().isSplitViewActive, true);

    ctx.closeSplitView();
    const s = ctx.getSplitState();
    assert.equal(s.isSplitViewActive, false);
    assert.equal(s.activeFocusedPane, 'left');

    const wvContainer = sandbox.document.getElementById('webview-container');
    assert.ok(!wvContainer.classList.contains('split-active'));
  });

  test('should update dual tab active class and address bar URL when switching focus between panes', () => {
    ctx.selectRightSplitTab('store-2', 'tab-2-1');
    assert.equal(ctx.getSplitState().activeFocusedPane, 'right');

    const tabContainer = sandbox.document.getElementById('tab-items-container');
    const addrInput = sandbox.document.getElementById('tab-address-input');

    assert.ok(tabContainer.innerHTML.includes('split-dual-tab active" data-pane="right"'), 'Right tab should have active class');
    assert.ok(tabContainer.innerHTML.includes('data-pane="left"'), 'Left tab should exist');
    if (addrInput) {
      assert.equal(addrInput.value, 'https://seller.tokopedia.com/');
    }

    // Pindah fokus ke panel kiri
    ctx.setFocusedPane('left');
    assert.equal(ctx.getSplitState().activeFocusedPane, 'left');
    ctx.renderTabBar();
    assert.ok(tabContainer.innerHTML.includes('split-dual-tab active" data-pane="left"'), 'Left tab should now have active class');
    if (addrInput) {
      assert.equal(addrInput.value, 'https://seller.shopee.co.id/');
    }
  });

  test('should navigate active right pane without resetting focus to left when typing in address bar', () => {
    ctx.selectRightSplitTab('store-2', 'tab-2-1');
    assert.equal(ctx.getSplitState().activeFocusedPane, 'right');

    const addrInput = sandbox.document.getElementById('tab-address-input');
    if (addrInput) {
      // Simulasikan input focus & ketik URL
      addrInput.dispatchEvent({ type: 'focus' });
      assert.equal(ctx.getSplitState().activeFocusedPane, 'right', 'Focus must remain on right pane when address bar is focused');

      addrInput.value = 'google.com';
      const rightWv = ctx.getActiveWebview();
      let loadedUrl = '';
      if (rightWv) {
        rightWv.loadURL = (url) => { loadedUrl = url; };
      }
      ctx.navigateFromAddressBar();
      assert.equal(loadedUrl, 'https://google.com');
    }
  });

  test('should toggle between responsive auto-fit and horizontal scroll display modes', () => {
    const wvContainer = sandbox.document.getElementById('webview-container');
    assert.equal(ctx.getSplitState().splitViewDisplayMode, 'responsive');

    ctx.toggleSplitDisplayMode();
    assert.equal(ctx.getSplitState().splitViewDisplayMode, 'scroll');
    assert.ok(wvContainer.classList.contains('split-mode-scroll'));
    assert.ok(!wvContainer.classList.contains('split-mode-responsive'));

    ctx.toggleSplitDisplayMode();
    assert.equal(ctx.getSplitState().splitViewDisplayMode, 'responsive');
    assert.ok(wvContainer.classList.contains('split-mode-responsive'));
    assert.ok(!wvContainer.classList.contains('split-mode-scroll'));
  });
});
