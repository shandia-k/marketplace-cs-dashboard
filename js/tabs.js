function activateStore(storeId) {
  if (typeof setFocusedPane === 'function') {
    setFocusedPane('left');
  }

  // Jika sebelumnya mode split aktif, keluar dari mode split saat memilih toko tunggal
  if (isSplitViewActive) {
    isSplitViewActive = false;
    activeSplitSessionId = null;
    const wvContainer = document.getElementById('webview-container');
    if (wvContainer) wvContainer.classList.remove('split-active');
    const rightBodyEl = document.getElementById('split-right-body');
    if (rightBodyEl) {
      rightBodyEl.style.display = 'none';
      rightBodyEl.querySelectorAll('webview.store-webview').forEach(el => {
        el.classList.remove('visible');
        el.style.display = 'none';
      });
    }
    const pickerEl = document.getElementById('split-tab-picker');
    if (pickerEl) pickerEl.style.display = 'none';
  }

  // Tutup & isolasi Find in Page agar tidak bocor saat berpindah toko
  if (typeof closeFindInPage === 'function') {
    closeFindInPage({ skipFocus: true });
  }

  // Hide all currently visible webviews
  Object.keys(webviewMap).forEach(tabId => {
    webviewMap[tabId].webview?.classList.remove('visible');
    if (webviewMap[tabId].loading) webviewMap[tabId].loading.style.display = 'none';
  });

  activeStoreId = storeId;
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  if (window.AppTelemetry) {
    window.AppTelemetry.track('store_switched');
  }

  if (window.DiagnosticLogger && typeof window.DiagnosticLogger.addBreadcrumb === 'function') {
    window.DiagnosticLogger.addBreadcrumb('STORE_SWITCH', `Beralih ke toko "${store.name || store.id}" (${store.marketplace || 'custom'})`, {
      storeId: store.id,
      storeName: store.name,
      marketplace: store.marketplace
    });
  }

  emptyState.style.display = 'none';
  webviewCont.classList.add('active');

  // Ensure this store has tabs
  ensureStoreTabs(store);

  // Show active tab of this store
  const activeTab = activeTabMap[storeId];
  if (activeTab) {
    lastAccessed[activeTab] = Date.now(); // track access
    showTab(storeId, activeTab);
  }

  renderTabBar();
  if (typeof renderSidebar === 'function') {
    renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
  }

  // Sinkronkan clipboard global & templates ke webview toko yang baru aktif
  if (typeof broadcastTemplatesToWebviews === 'function') {
    broadcastTemplatesToWebviews();
  }
}

// ── Tab System & Persistence ──────────────────────────────────────────────────

function saveStoreTabsState() {
  try {
    const existingSaved = Storage.get('persistentStoreTabs', {}, true) || {};
    const existingActiveMap = Storage.get('persistentActiveTabMap', {}, true) || {};
    const serializedTabs = (typeof existingSaved === 'object' && existingSaved !== null) ? { ...existingSaved } : {};
    const mergedActiveMap = (typeof existingActiveMap === 'object' && existingActiveMap !== null) ? { ...existingActiveMap } : {};

    Object.entries(storeTabs).forEach(([storeId, tabs]) => {
      if (Array.isArray(tabs) && tabs.length > 0) {
        serializedTabs[storeId] = tabs.map(t => {
          let liveUrl = t.url;
          const wvEntry = webviewMap[t.id];
          if (wvEntry && wvEntry.webview && typeof wvEntry.webview.getURL === 'function') {
            try {
              const cur = wvEntry.webview.getURL();
              if (cur && cur !== 'about:blank' && !cur.startsWith('data:') && !cur.startsWith('chrome-error://')) {
                liveUrl = cur;
                t.url = cur;
              }
            } catch (e) {}
          }
          return {
            id: t.id,
            title: t.title || 'Chat',
            url: liveUrl,
            initialUrl: t.initialUrl || liveUrl,
            zoom: typeof t.zoom === 'number' ? t.zoom : 1.0
          };
        });
      }
    });

    Object.entries(activeTabMap).forEach(([storeId, tabId]) => {
      if (tabId) {
        mergedActiveMap[storeId] = tabId;
      }
    });

    Storage.set('persistentStoreTabs', serializedTabs, true);
    Storage.set('persistentActiveTabMap', mergedActiveMap, true);
    if (activeStoreId) {
      Storage.set('lastActiveStoreId', activeStoreId, true);
    }
  } catch (e) {
    console.error('Error saving persistent tabs:', e);
  }
}

const debouncedSaveStoreTabsState = typeof debounce === 'function' 
  ? debounce(saveStoreTabsState, 300) 
  : saveStoreTabsState;

window.saveStoreTabsState = saveStoreTabsState;
window.debouncedSaveStoreTabsState = debouncedSaveStoreTabsState;

// Auto-save tabs state saat window dashboard sebelum ditutup atau dimuat ulang
window.addEventListener('beforeunload', () => {
  saveStoreTabsState();
});

function ensureStoreTabs(store) {
  if (!store || !store.id) return;
  if (!storeTabs[store.id] || !Array.isArray(storeTabs[store.id]) || storeTabs[store.id].length === 0) {
    const savedTabsData = Storage.get('persistentStoreTabs', {}, true) || {};
    const savedActiveMap = Storage.get('persistentActiveTabMap', {}, true) || {};
    const savedTabsForStore = savedTabsData[store.id];

    if (Array.isArray(savedTabsForStore) && savedTabsForStore.length > 0) {
      // Pulihkan tab-tab yang sebelumnya dibuka oleh CS dari sesi lalu
      storeTabs[store.id] = savedTabsForStore.map(t => {
        let tUrl = t.url || store.url || 'https://www.google.com';
        let tInitUrl = t.initialUrl || t.url || store.url || 'https://www.google.com';
        if (store.marketplace === 'shopee') {
          if (tUrl === 'https://seller.shopee.co.id/portal/chat' || tUrl === 'https://seller.shopee.co.id/portal/chat/') {
            tUrl = 'https://seller.shopee.co.id/';
          }
          if (tInitUrl === 'https://seller.shopee.co.id/portal/chat' || tInitUrl === 'https://seller.shopee.co.id/portal/chat/') {
            tInitUrl = 'https://seller.shopee.co.id/';
          }
        }
        return {
          id: t.id || `tab-${generateId()}`,
          title: t.title || 'Chat',
          url: tUrl,
          initialUrl: tInitUrl,
          zoom: typeof t.zoom === 'number' ? t.zoom : 1.0
        };
      });

      const savedActiveTabId = savedActiveMap[store.id];
      const hasActive = storeTabs[store.id].some(t => t.id === savedActiveTabId);
      activeTabMap[store.id] = hasActive ? savedActiveTabId : storeTabs[store.id][0].id;
    } else {
      const cfg = (typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[store.marketplace] : null) || MARKETPLACE_CONFIG.custom;
      const tabId = `tab-${generateId()}`;
      const initialUrl = store.url || cfg.url || 'https://www.google.com';
      storeTabs[store.id] = [{
        id: tabId,
        title: 'Chat',
        url: initialUrl,
        initialUrl: initialUrl,
        zoom: 1.0
      }];
      activeTabMap[store.id] = tabId;
      saveStoreTabsState();
    }
  }
}

// ── Tab Bar Shell & Rendering ──────────────────────────────────────────────────

function ensureTabBarShell() {
  if (tabBar.querySelector('.tab-nav-controls') && tabBar.querySelector('.tab-address-bar-wrap') && tabBar.querySelector('.tab-items-container')) {
    return;
  }

  tabBar.innerHTML = `
    <div class="tab-nav-controls" role="toolbar" aria-label="Kontrol Navigasi Tab">
      <button class="tab-nav-btn" id="btn-nav-back" title="Kembali (Alt+\u2190)" aria-label="Kembali ke halaman sebelumnya">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-forward" title="Maju (Alt+\u2192)" aria-label="Maju ke halaman berikutnya">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-refresh" title="Refresh (F5)" aria-label="Muat ulang halaman">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>
    </div>
    <div class="tab-address-bar-wrap" id="tab-address-bar-wrap" title="Ketik URL (e.g. cekresi.com, maps, atau link produk)">
      <div class="tab-address-icon" id="tab-address-icon" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <input type="text" class="tab-address-input" id="tab-address-input" placeholder="Ketik URL / cari web..." autocomplete="off" spellcheck="false" aria-label="Alamat URL web atau pencarian">
      <button class="tab-address-btn-go" id="btn-tab-address-go" title="Buka URL (Enter)" aria-label="Buka alamat URL">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
    <div class="tab-nav-separator" aria-hidden="true"></div>
    <div class="tab-items-container" id="tab-items-container" role="tablist"></div>
    <div class="tab-bar-actions" id="tab-bar-actions">
      <button class="tab-add-btn" id="btn-add-tab" title="Buka tab baru" aria-label="Buka tab baru">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
      <button class="tab-split-btn" id="btn-toggle-split" title="Buka Tampilan Berdampingan (Side-by-Side View)" aria-label="Buka Tampilan Berdampingan">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="12" y1="3" x2="12" y2="21"/>
        </svg>
      </button>
    </div>
  `;

  // Bind Add Tab & Split view buttons (fixed on screen)
  document.getElementById('btn-add-tab')?.addEventListener('click', () => {
    if (activeStoreId) addTab(activeStoreId);
  });
  document.getElementById('btn-toggle-split')?.addEventListener('click', () => toggleSplitView());

  // Bind navigation buttons
  document.getElementById('btn-nav-back')?.addEventListener('click', () => {
    const wv = getActiveWebview();
    if (wv?.canGoBack()) wv.goBack();
  });
  document.getElementById('btn-nav-forward')?.addEventListener('click', () => {
    const wv = getActiveWebview();
    if (wv?.canGoForward()) wv.goForward();
  });
  document.getElementById('btn-nav-refresh')?.addEventListener('click', (e) => {
    if (window.AppTelemetry) {
      window.AppTelemetry.track('tab_nav_refresh_clicked');
    }
    const wv = getActiveWebview();
    const isCrashed = !wv || !wv.isConnected || (typeof wv.isCrashed === 'function' && wv.isCrashed());
    if (e.shiftKey || e.ctrlKey || isCrashed) {
      if (typeof forceRecreateActiveTab === 'function') {
        forceRecreateActiveTab();
      }
    } else {
      try {
        wv.reload();
      } catch (err) {
        if (typeof forceRecreateActiveTab === 'function') forceRecreateActiveTab();
      }
    }
  });

  // Bind Address Bar events
  const addrInput = document.getElementById('tab-address-input');
  const btnAddrGo = document.getElementById('btn-tab-address-go');
  btnAddrGo?.addEventListener('click', () => navigateFromAddressBar());
  addrInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateFromAddressBar();
    } else if (e.key === 'Escape') {
      // Batal edit, kembalikan ke URL halaman aktif saat ini
      const wv = getActiveWebview();
      if (wv && typeof wv.getURL === 'function') {
        try {
          const curUrl = wv.getURL();
          if (curUrl && curUrl !== 'about:blank') addrInput.value = curUrl;
        } catch (err) {}
      }
      addrInput.blur();
    }
  });

  // Seleksi teks mulus saat pertama kali fokus tanpa timer berbenturan
  let isMouseDownOnAddr = false;
  addrInput?.addEventListener('mousedown', () => {
    if (document.activeElement !== addrInput) {
      isMouseDownOnAddr = true;
    }
  });
  addrInput?.addEventListener('focus', () => {
    if (isMouseDownOnAddr) {
      setTimeout(() => {
        if (typeof addrInput.select === 'function') addrInput.select();
        isMouseDownOnAddr = false;
      }, 0);
    } else {
      if (typeof addrInput.select === 'function') addrInput.select();
    }
  });
  addrInput?.addEventListener('mouseup', (e) => {
    if (isMouseDownOnAddr) {
      e.preventDefault();
      isMouseDownOnAddr = false;
    }
  });

  // Enable smooth horizontal scrolling on mouse wheel
  const tabItemsContainer = document.getElementById('tab-items-container');
  tabItemsContainer?.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      tabItemsContainer.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
}

function renderTabBar() {
  if (typeof stores === 'undefined' || !Array.isArray(stores) || stores.length === 0) {
    if (tabBar) tabBar.style.display = 'none';
    return;
  }

  ensureTabBarShell();
  tabBar.style.display = 'flex';

  const tabItemsContainer = document.getElementById('tab-items-container');
  if (!tabItemsContainer) return;

  // ── 1. RENDER SYMMETRICAL DUAL SPLIT TABS (Jika Mode Split Aktif) ──────────
  if (isSplitViewActive && splitRightStoreId && splitRightTabId) {
    const sLeft = stores.find(s => s.id === activeStoreId);
    const sRight = stores.find(s => s.id === splitRightStoreId);
    const tLeft = storeTabs[activeStoreId]?.find(t => t.id === activeTabMap[activeStoreId]);
    const tRight = storeTabs[splitRightStoreId]?.find(t => t.id === splitRightTabId);

    const cfgLeft = (typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[sLeft?.marketplace] : null) || MARKETPLACE_CONFIG?.custom || { faviconClass: 'fav-custom' };
    const cfgRight = (typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[sRight?.marketplace] : null) || MARKETPLACE_CONFIG?.custom || { faviconClass: 'fav-custom' };

    const initLeft = (sLeft?.initials || sLeft?.name?.substring(0, 2) || 'L').toUpperCase();
    const initRight = (sRight?.initials || sRight?.name?.substring(0, 2) || 'R').toUpperCase();

    const activeTabObj = (activeFocusedPane === 'right') ? tRight : tLeft;
    const activeStoreObj = (activeFocusedPane === 'right') ? sRight : sLeft;
    let activeTabUrl = activeTabObj?.url || activeStoreObj?.url || '';
    const activeWv = getActiveWebview();
    if (activeWv && typeof activeWv.getURL === 'function') {
      try {
        const cur = activeWv.getURL();
        if (cur && cur !== 'about:blank') activeTabUrl = cur;
      } catch (e) {}
    }

    const addrInput = document.getElementById('tab-address-input');
    if (addrInput && document.activeElement !== addrInput) {
      addrInput.value = activeTabUrl;
    }

    tabItemsContainer.setAttribute('aria-label', `Daftar tab split berdampingan`);

    const actionsEl = document.getElementById('tab-bar-actions');
    if (actionsEl) actionsEl.style.display = 'none';

    const curSession = activeSplitSessionId ? splitSessions.find(s => s.id === activeSplitSessionId) : null;
    const isFav = !!curSession?.isFavorite;

    const fullTabsHtml = `
      <div class="tab-item split-dual-tab ${activeFocusedPane === 'left' ? 'active' : ''}" data-pane="left" title="Panel Kiri: ${escapeHtml(sLeft?.name || '')} — ${escapeHtml(tLeft?.title || '')}">
        <div class="tab-favicon-mini ${cfgLeft.faviconClass}" style="background: ${escapeHtml(sLeft?.color || '')}">${escapeHtml(initLeft)}</div>
        <span class="tab-title"><b>${escapeHtml(sLeft?.name || 'Toko Kiri')}</b> — ${escapeHtml(tLeft?.title || 'Chat')}</span>
      </div>
      <div class="tab-item split-dual-tab ${activeFocusedPane === 'right' ? 'active' : ''}" data-pane="right" title="Panel Kanan: ${escapeHtml(sRight?.name || '')} — ${escapeHtml(tRight?.title || '')}">
        <div class="tab-favicon-mini ${cfgRight.faviconClass}" style="background: ${escapeHtml(sRight?.color || '')}">${escapeHtml(initRight)}</div>
        <span class="tab-title"><b>${escapeHtml(sRight?.name || 'Toko Kanan')}</b> — ${escapeHtml(tRight?.title || 'Chat')}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; margin-left: 6px;">
        <button type="button" class="tab-split-action-btn favorite ${isFav ? 'active' : ''}" id="btn-split-toggle-fav" title="${isFav ? 'Hapus dari Split View Favorit' : 'Simpan sebagai Split View Favorit (⭐)'}">
          <span>${isFav ? '⭐ Tersimpan' : '☆ Favorit'}</span>
        </button>
        <button type="button" class="tab-split-action-btn" id="btn-split-toggle-mode" title="Ganti Mode Tampilan (Fit / Scroll)">
          <span>${splitViewDisplayMode === 'scroll' ? '📜 Scroll' : '↔ Fit'}</span>
        </button>
        <button type="button" class="tab-split-action-btn" id="btn-split-swap-tabs" title="Tukar Posisi Kiri & Kanan" aria-label="Tukar Posisi Kiri & Kanan">
          <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>
          </svg>
        </button>
        <button type="button" class="tab-split-action-btn" id="btn-split-change-tab" title="Ganti Tab Panel Kanan" aria-label="Ganti Tab Panel Kanan">
          <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          <span>Ganti</span>
        </button>
        <button type="button" class="tab-split-action-btn close" id="btn-split-close-dual" title="Tutup Sesi Split" aria-label="Tutup Sesi Split">
          <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    if (tabItemsContainer.dataset.lastHtml === fullTabsHtml) {
      updateNavButtonStates();
      return;
    }

    tabItemsContainer.dataset.lastHtml = fullTabsHtml;
    tabItemsContainer.innerHTML = fullTabsHtml;

    tabItemsContainer.querySelector('.split-dual-tab[data-pane="left"]')?.addEventListener('click', () => setFocusedPane('left'));
    tabItemsContainer.querySelector('.split-dual-tab[data-pane="right"]')?.addEventListener('click', () => setFocusedPane('right'));
    document.getElementById('btn-split-toggle-fav')?.addEventListener('click', () => {
      if (activeSplitSessionId) toggleFavoriteSplitSession(activeSplitSessionId);
    });
    document.getElementById('btn-split-toggle-mode')?.addEventListener('click', () => toggleSplitDisplayMode());
    document.getElementById('btn-split-swap-tabs')?.addEventListener('click', () => swapSplitPanes());
    document.getElementById('btn-split-change-tab')?.addEventListener('click', () => openSplitTabPicker());
    document.getElementById('btn-split-close-dual')?.addEventListener('click', () => closeSplitView());

    updateNavButtonStates();
    return;
  }

  // ── 2. RENDER REGULAR SINGLE STORE TABS ─────────────────────────────────────
  const store = stores.find(s => s.id === activeStoreId);
  if (!store) return;

  const cfg      = (typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[store.marketplace] : null) || MARKETPLACE_CONFIG.custom;
  const tabs     = storeTabs[activeStoreId];
  const curTabId = activeTabMap[activeStoreId];
  const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
  const bgStyle  = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';

  const activeTabObj = tabs.find(t => t.id === curTabId);
  let activeTabUrl = activeTabObj?.url || store.url || cfg.url || '';
  const activeWv = getActiveWebview();
  if (activeWv && typeof activeWv.getURL === 'function') {
    try {
      const curUrl = activeWv.getURL();
      if (curUrl && curUrl !== 'about:blank') activeTabUrl = curUrl;
    } catch (e) {}
  }

  // Update address bar value hanya jika pengguna TIDAK sedang fokus/mengetik
  const addrInput = document.getElementById('tab-address-input');
  if (addrInput && document.activeElement !== addrInput) {
    addrInput.value = activeTabUrl;
  }

  tabItemsContainer.setAttribute('aria-label', `Daftar tab toko ${escapeHtml(store.name)}`);

  const tabsHtml = tabs.map(tab => {
    const entry = webviewMap[tab.id];
    const isSyncing = entry?.isSyncing;
    const syncProgress = entry?.syncProgress;
    const isCurTab = tab.id === curTabId;

    let syncBadgeHtml = '';
    if (isSyncing) {
      const hasPercent = typeof syncProgress === 'number' && !isNaN(syncProgress) && syncProgress >= 0;
      const progStr = hasPercent ? ` ${syncProgress}%` : '';
      const tooltipMsg = hasPercent ? `Sedang menyinkronkan chat (${syncProgress}%)` : 'Sedang menyinkronkan chat...';
      syncBadgeHtml = `
        <span class="tab-sync-badge" title="${tooltipMsg}" aria-label="${tooltipMsg}">
          <svg class="sync-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>${progStr}
        </span>`;
    }

    const hasPercent = typeof syncProgress === 'number' && !isNaN(syncProgress) && syncProgress >= 0;
    const tabTooltip = isSyncing 
      ? (hasPercent ? `Sedang menyinkronkan chat (${syncProgress}%)` : 'Sedang menyinkronkan chat...') 
      : escapeHtml(tab.title);

    return `
    <div class="tab-item ${isCurTab ? 'active' : ''} ${isSyncing ? 'syncing' : ''}" data-tab-id="${tab.id}" title="${tabTooltip}" role="tab" aria-selected="${isCurTab ? 'true' : 'false'}" aria-label="${tabTooltip}">
      <div class="tab-favicon-mini ${cfg.faviconClass}" ${bgStyle} aria-hidden="true">${escapeHtml(initials.substring(0, 2))}</div>
      <span class="tab-title">${escapeHtml(tab.title)}</span>
      ${syncBadgeHtml}
      <div class="tab-actions">
        <button class="tab-close" data-tab-id="${tab.id}" title="Tutup tab" aria-label="Tutup tab ${escapeHtml(tab.title)}">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" focusable="false">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>`;
  }).join('');

  // Update fixed Action Buttons (Add Tab & Split View) di sebelah kanan tab bar
  const actionsEl = document.getElementById('tab-bar-actions');
  if (actionsEl) actionsEl.style.display = 'flex';

  const addBtn = document.getElementById('btn-add-tab');
  if (addBtn) {
    addBtn.title = `Buka tab baru untuk ${escapeHtml(store.name)}`;
    addBtn.setAttribute('aria-label', `Buka tab baru untuk ${escapeHtml(store.name)}`);
  }

  const splitBtn = document.getElementById('btn-toggle-split');
  if (splitBtn) {
    splitBtn.className = `tab-split-btn ${isSplitViewActive ? 'active' : ''}`;
    splitBtn.title = isSplitViewActive ? 'Tutup Tampilan Berdampingan (Split View)' : 'Buka Tampilan Berdampingan (Side-by-Side View)';
  }

  if (tabItemsContainer.dataset.lastHtml === tabsHtml) {
    updateNavButtonStates();
    return;
  }
  tabItemsContainer.dataset.lastHtml = tabsHtml;
  tabItemsContainer.innerHTML = tabsHtml;

  // Bind tab click (not close)
  tabItemsContainer.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', e => {
      if (!e.target.closest('.tab-close') && !e.target.closest('.tab-sync-badge')) {
        if (typeof setFocusedPane === 'function') setFocusedPane('left');
        switchTab(activeStoreId, el.dataset.tabId);
      }
    });
  });

  // Bind click pada badge sinkronisasi untuk membuka modal info edukasi
  tabItemsContainer.querySelectorAll('.tab-sync-badge').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof openWaSyncEduModal === 'function') {
        openWaSyncEduModal();
      }
    });
  });

  // Bind close buttons
  tabItemsContainer.querySelectorAll('.tab-close').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      closeTab(activeStoreId, el.dataset.tabId);
    });
  });

  // Update nav button states
  updateNavButtonStates();
}

function updateAddressBarUrl(url) {
  const input = document.getElementById('tab-address-input');
  if (!input) return;
  if (document.activeElement === input) return;
  if (url && url !== 'about:blank') {
    input.value = url;
  }
}
window.updateAddressBarUrl = updateAddressBarUrl;

function navigateFromAddressBar() {
  const input = document.getElementById('tab-address-input');
  if (!input) return;
  let raw = (input.value || '').trim();
  if (!raw) return;

  let targetUrl = raw;
  if (!/^https?:\/\//i.test(raw)) {
    if (raw.includes('.') && !raw.includes(' ')) {
      targetUrl = 'https://' + raw;
    } else {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
    }
  }

  const wv = getActiveWebview();
  if (wv) {
    if (window.AppTelemetry) {
      window.AppTelemetry.track('tab_address_bar_navigated');
    }
    try {
      wv.loadURL(targetUrl);
    } catch (e) {
      wv.src = targetUrl;
    }
    input.blur();
  }
}
window.navigateFromAddressBar = navigateFromAddressBar;

// ── Helper: ambil webview aktif saat ini ──────────────────────────────────────
function getActiveWebview() {
  if (isSplitViewActive && activeFocusedPane === 'right' && splitRightTabId) {
    const entry = webviewMap[splitRightTabId];
    if (entry && entry.webview && (entry.webview.isConnected !== false)) {
      return entry.webview;
    }
  }

  if (typeof activeStoreId !== 'undefined' && activeStoreId && activeTabMap[activeStoreId]) {
    const tabId = activeTabMap[activeStoreId];
    const entry = webviewMap[tabId];
    if (entry && entry.webview && (entry.webview.isConnected !== false)) {
      return entry.webview;
    }
  }
  const visibleWv = document.querySelector('webview.store-webview.visible') || document.querySelector('webview.visible');
  return visibleWv || null;
}

function getActiveWcId() {
  const wv = getActiveWebview();
  if (wv && typeof wv.getWebContentsId === 'function') {
    try {
      const liveId = wv.getWebContentsId();
      if (typeof liveId === 'number' && liveId > 0) {
        if (isSplitViewActive && activeFocusedPane === 'right' && splitRightTabId) {
          if (webviewMap[splitRightTabId]) webviewMap[splitRightTabId].wcId = liveId;
        } else if (typeof activeStoreId !== 'undefined' && activeStoreId && activeTabMap[activeStoreId]) {
          const tabId = activeTabMap[activeStoreId];
          if (webviewMap[tabId]) webviewMap[tabId].wcId = liveId;
        }
        return liveId;
      }
    } catch (e) { }
  }

  if (isSplitViewActive && activeFocusedPane === 'right' && splitRightTabId) {
    const entry = webviewMap[splitRightTabId];
    if (entry && entry.wcId) return entry.wcId;
  }
  if (typeof activeStoreId !== 'undefined' && activeStoreId && activeTabMap[activeStoreId]) {
    const tabId = activeTabMap[activeStoreId];
    const entry = webviewMap[tabId];
    if (entry && entry.wcId) return entry.wcId;
  }
  return null;
}
window.getActiveWcId = getActiveWcId;
window.getActiveWebview = getActiveWebview;

// ── Side-by-Side (Split View) Controller Functions ───────────────────────────
function toggleSplitView(forceState) {
  const nextState = typeof forceState === 'boolean' ? forceState : !isSplitViewActive;
  const webviewContainer = document.getElementById('webview-container');

  if (nextState) {
    isSplitViewActive = true;
    if (webviewContainer) {
      webviewContainer.classList.add('split-active');
      webviewContainer.style.setProperty('--split-ratio', `${splitRatio}%`);
    }

    if (!splitRightTabId || !splitRightStoreId) {
      openSplitTabPicker();
    } else {
      const store = stores.find(s => s.id === splitRightStoreId);
      const tab = store ? storeTabs[splitRightStoreId]?.find(t => t.id === splitRightTabId) : null;
      if (store && tab) {
        selectRightSplitTab(splitRightStoreId, splitRightTabId);
      } else {
        openSplitTabPicker();
      }
    }
  } else {
    closeSplitView();
  }

  renderTabBar();
}
window.toggleSplitView = toggleSplitView;

function openSplitTabPicker() {
  isSplitViewActive = true;
  activeFocusedPane = 'right';
  const webviewContainer = document.getElementById('webview-container');
  const pickerEl = document.getElementById('split-tab-picker');
  const rightBodyEl = document.getElementById('split-right-body');

  if (webviewContainer) {
    webviewContainer.classList.add('split-active');
    webviewContainer.style.setProperty('--split-ratio', `${splitRatio}%`);
  }
  if (pickerEl) pickerEl.style.display = 'flex';
  if (rightBodyEl) rightBodyEl.style.display = 'none';

  if (typeof renderSplitTabPicker === 'function') {
    renderSplitTabPicker();
  }
  renderTabBar();
  updatePaneFocusUI();

  const searchInput = document.getElementById('split-picker-search-input');
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 80);
  }
}
window.openSplitTabPicker = openSplitTabPicker;

function cancelSplitTabPicker() {
  if (splitRightStoreId && splitRightTabId) {
    const pickerEl = document.getElementById('split-tab-picker');
    const rightBodyEl = document.getElementById('split-right-body');
    if (pickerEl) pickerEl.style.display = 'none';
    if (rightBodyEl) rightBodyEl.style.display = 'flex';
    setFocusedPane('right');
  } else {
    closeSplitView();
  }
}
window.cancelSplitTabPicker = cancelSplitTabPicker;

function selectRightSplitTab(storeId, tabId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;
  ensureStoreTabs(store);
  const tab = storeTabs[storeId]?.find(t => t.id === tabId);
  if (!tab) return;

  const leftStoreId = activeStoreId;
  const leftTabId = activeTabMap[activeStoreId];
  const sLeft = stores.find(s => s.id === leftStoreId);

  // Buat atau perbarui Split Session
  let session = activeSplitSessionId ? splitSessions.find(s => s.id === activeSplitSessionId) : null;
  if (!session) {
    const sessionId = `split-${Date.now()}`;
    session = {
      id: sessionId,
      name: `${sLeft ? sLeft.name : 'Toko A'} + ${store.name}`,
      leftStoreId,
      leftTabId,
      rightStoreId: storeId,
      rightTabId: tabId,
      ratio: splitRatio || 50,
      mode: splitViewDisplayMode || 'responsive',
      isFavorite: false
    };
    splitSessions.push(session);
    activeSplitSessionId = sessionId;
  } else {
    session.rightStoreId = storeId;
    session.rightTabId = tabId;
    session.name = `${sLeft ? sLeft.name : 'Toko A'} + ${store.name}`;
    if (session.isFavorite) {
      saveFavoriteSplitSessions();
    }
  }

  splitRightStoreId = storeId;
  splitRightTabId = tabId;
  isSplitViewActive = true;
  activeFocusedPane = 'right';

  const pickerEl = document.getElementById('split-tab-picker');
  const rightBodyEl = document.getElementById('split-right-body');
  const webviewContainer = document.getElementById('webview-container');

  if (pickerEl) pickerEl.style.display = 'none';
  if (rightBodyEl) rightBodyEl.style.display = 'flex';
  if (webviewContainer) {
    webviewContainer.classList.add('split-active');
    webviewContainer.style.setProperty('--split-ratio', `${splitRatio}%`);
  }
  if (typeof showTabInRightPane === 'function') {
    showTabInRightPane(store, tab);
  }

  renderTabBar();
  applySplitDisplayModeUI();
  updatePaneFocusUI();
  if (typeof renderSidebar === 'function') {
    renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
  }

  if (window.AppTelemetry) {
    window.AppTelemetry.track('split_view_opened');
  }
}
window.selectRightSplitTab = selectRightSplitTab;

function saveFavoriteSplitSessions() {
  try {
    const favorites = splitSessions
      .filter(s => s.isFavorite)
      .map(s => ({
        id: s.id,
        name: s.name,
        leftStoreId: s.leftStoreId,
        leftTabId: s.leftTabId,
        rightStoreId: s.rightStoreId,
        rightTabId: s.rightTabId,
        ratio: s.ratio || 50,
        mode: s.mode || 'responsive',
        isFavorite: true
      }));
    localStorage.setItem('antigravity_favorite_split_sessions', JSON.stringify(favorites));
  } catch (e) {
    console.error('Error saving favorite split sessions:', e);
  }
}
window.saveFavoriteSplitSessions = saveFavoriteSplitSessions;

function loadFavoriteSplitSessions() {
  try {
    const raw = localStorage.getItem('antigravity_favorite_split_sessions');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach(saved => {
        if (!splitSessions.some(s => s.id === saved.id)) {
          splitSessions.push({ ...saved, isFavorite: true });
        }
      });
    }
  } catch (e) {
    console.error('Error loading favorite split sessions:', e);
  }
}
window.loadFavoriteSplitSessions = loadFavoriteSplitSessions;

function toggleFavoriteSplitSession(sessionId) {
  let session = splitSessions.find(s => s.id === sessionId);
  if (!session) return;

  session.isFavorite = !session.isFavorite;
  saveFavoriteSplitSessions();

  if (session.isFavorite) {
    if (typeof showToast === 'function') showToast(`⭐ Sesi split "${session.name}" disimpan ke Favorit!`, 'success');
  } else {
    if (typeof showToast === 'function') showToast(`Sesi split dihapus dari Favorit`, '');
  }

  renderTabBar();
  if (typeof renderSidebar === 'function') {
    renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
  }
}
window.toggleFavoriteSplitSession = toggleFavoriteSplitSession;

function deleteFavoriteSplitSession(sessionId) {
  const idx = splitSessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    splitSessions.splice(idx, 1);
    saveFavoriteSplitSessions();
  }

  if (activeSplitSessionId === sessionId) {
    activeSplitSessionId = null;
    closeSplitView();
  } else {
    if (typeof renderSidebar === 'function') {
      renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
    }
  }
}
window.deleteFavoriteSplitSession = deleteFavoriteSplitSession;

function activateSplitSession(sessionId) {
  const session = splitSessions.find(s => s.id === sessionId);
  if (!session) return;

  activeSplitSessionId = session.id;
  isSplitViewActive = true;
  activeFocusedPane = 'left';

  activeStoreId = session.leftStoreId;
  const sLeft = stores.find(s => s.id === session.leftStoreId);
  if (sLeft) {
    ensureStoreTabs(sLeft);
    const leftTabExists = storeTabs[sLeft.id]?.some(t => t.id === session.leftTabId);
    if (!leftTabExists && storeTabs[sLeft.id]?.length > 0) {
      session.leftTabId = storeTabs[sLeft.id][0].id;
    }
    if (session.leftTabId) {
      activeTabMap[session.leftStoreId] = session.leftTabId;
    }
  }

  splitRightStoreId = session.rightStoreId;
  const sRight = stores.find(s => s.id === session.rightStoreId);
  if (sRight) {
    ensureStoreTabs(sRight);
    const rightTabExists = storeTabs[sRight.id]?.some(t => t.id === session.rightTabId);
    if (!rightTabExists && storeTabs[sRight.id]?.length > 0) {
      session.rightTabId = storeTabs[sRight.id][0].id;
    }
    splitRightTabId = session.rightTabId;
  }

  splitRatio = session.ratio || 50;
  if (session.mode) {
    splitViewDisplayMode = session.mode;
  }

  const webviewContainer = document.getElementById('webview-container');
  if (webviewContainer) {
    webviewContainer.classList.add('split-active');
    webviewContainer.style.setProperty('--split-ratio', `${splitRatio}%`);
  }

  const pickerEl = document.getElementById('split-tab-picker');
  const rightBodyEl = document.getElementById('split-right-body');
  if (pickerEl) pickerEl.style.display = 'none';
  if (rightBodyEl) rightBodyEl.style.display = 'flex';

  if (sLeft && session.leftTabId) {
    showTab(session.leftStoreId, session.leftTabId);
  }

  const tRight = sRight && session.rightTabId ? storeTabs[session.rightStoreId]?.find(t => t.id === session.rightTabId) : null;
  if (sRight && tRight && typeof showTabInRightPane === 'function') {
    showTabInRightPane(sRight, tRight);
  }

  renderTabBar();
  applySplitDisplayModeUI();
  updatePaneFocusUI();
  if (typeof renderSidebar === 'function') {
    renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
  }
}
window.activateSplitSession = activateSplitSession;

function closeSplitSession(sessionId) {
  const session = splitSessions.find(s => s.id === sessionId);
  if (!session) return;

  if (session.isFavorite) {
    // Sesi favorit: jika sedang aktif di layar, tutup view layar saja (tetap tersimpan di sidebar sebagai favorit)
    if (activeSplitSessionId === sessionId) {
      activeSplitSessionId = null;
      closeSplitView();
    } else {
      // Jika diklik hapus saat tidak sedang aktif di layar, hapus dari favorit
      deleteFavoriteSplitSession(sessionId);
    }
  } else {
    // Sesi sementara: hapus dari daftar
    const idx = splitSessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      splitSessions.splice(idx, 1);
    }
    if (activeSplitSessionId === sessionId) {
      activeSplitSessionId = null;
      closeSplitView();
    } else {
      if (typeof renderSidebar === 'function') {
        renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
      }
    }
  }
}
window.closeSplitSession = closeSplitSession;

function closeSplitView() {
  isSplitViewActive = false;
  activeSplitSessionId = null;
  activeFocusedPane = 'left';

  const webviewContainer = document.getElementById('webview-container');
  if (webviewContainer) {
    webviewContainer.classList.remove('split-active');
  }

  const pickerEl = document.getElementById('split-tab-picker');
  const rightBodyEl = document.getElementById('split-right-body');

  if (pickerEl) pickerEl.style.display = 'none';
  if (rightBodyEl) {
    rightBodyEl.style.display = 'none';
    rightBodyEl.querySelectorAll('webview.store-webview').forEach(wv => {
      wv.classList.remove('visible');
      wv.style.display = 'none';
    });
  }

  updatePaneFocusUI();
  renderTabBar();
  if (typeof renderSidebar === 'function') {
    renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
  }

  if (window.AppTelemetry) {
    window.AppTelemetry.track('split_view_closed');
  }
}
window.closeSplitView = closeSplitView;

function swapSplitPanes() {
  if (!isSplitViewActive || !splitRightStoreId || !splitRightTabId || !activeStoreId) return;

  const leftStoreId = activeStoreId;
  const leftTabId = activeTabMap[activeStoreId];

  const rightStoreId = splitRightStoreId;
  const rightTabId = splitRightTabId;

  // 1. Set toko kanan menjadi toko aktif utama di sisi kiri
  activeStoreId = rightStoreId;
  if (rightTabId) {
    activeTabMap[rightStoreId] = rightTabId;
  }

  // 2. Set toko kiri lama menjadi toko sisi kanan
  splitRightStoreId = leftStoreId;
  splitRightTabId = leftTabId;

  // Update Split Session jika ada
  if (activeSplitSessionId) {
    const curSession = splitSessions.find(s => s.id === activeSplitSessionId);
    if (curSession) {
      curSession.leftStoreId = rightStoreId;
      curSession.leftTabId = rightTabId;
      curSession.rightStoreId = leftStoreId;
      curSession.rightTabId = leftTabId;
      const sLeft = stores.find(s => s.id === rightStoreId);
      const sRight = stores.find(s => s.id === leftStoreId);
      if (sLeft && sRight) curSession.name = `${sLeft.name} + ${sRight.name}`;
    }
  }

  // 3. Tampilkan tab baru di pane kiri
  const rightStoreObj = stores.find(s => s.id === rightStoreId);
  const rightTabObj = storeTabs[rightStoreId]?.find(t => t.id === rightTabId);
  if (rightStoreObj && rightTabObj) {
    showTab(rightStoreId, rightTabId);
  }

  // 4. Tampilkan tab lama di pane kanan
  const leftStoreObj = stores.find(s => s.id === leftStoreId);
  const leftTabObj = storeTabs[leftStoreId]?.find(t => t.id === leftTabId);
  if (leftStoreObj && leftTabObj && typeof showTabInRightPane === 'function') {
    showTabInRightPane(leftStoreObj, leftTabObj);
  }

  saveStoreTabsState();
  renderTabBar();
  if (typeof renderSidebar === 'function') {
    renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
  }
  updatePaneFocusUI();

  showToast('⇄ Posisi tampilan kiri dan kanan ditukar!', 'success');
}
window.swapSplitPanes = swapSplitPanes;

function setFocusedPane(pane) {
  activeFocusedPane = pane;
  updatePaneFocusUI();
}
window.setFocusedPane = setFocusedPane;

function updatePaneFocusUI() {
  const leftPane = document.getElementById('split-pane-left');
  const rightPane = document.getElementById('split-pane-right');

  if (leftPane) {
    if (isSplitViewActive && activeFocusedPane === 'left') {
      leftPane.classList.add('focused');
    } else {
      leftPane.classList.remove('focused');
    }
  }

  if (rightPane) {
    if (isSplitViewActive && activeFocusedPane === 'right') {
      rightPane.classList.add('focused');
    } else {
      rightPane.classList.remove('focused');
    }
  }

  // 1. Update visual tab active highlight pada Dual Tab Bar di atas
  const tabItemsContainer = document.getElementById('tab-items-container');
  if (tabItemsContainer) {
    const leftTabEl = tabItemsContainer.querySelector('.split-dual-tab[data-pane="left"]');
    const rightTabEl = tabItemsContainer.querySelector('.split-dual-tab[data-pane="right"]');
    if (leftTabEl && rightTabEl) {
      if (activeFocusedPane === 'left') {
        leftTabEl.classList.add('active');
        leftTabEl.setAttribute('aria-selected', 'true');
        rightTabEl.classList.remove('active');
        rightTabEl.setAttribute('aria-selected', 'false');
      } else {
        rightTabEl.classList.add('active');
        rightTabEl.setAttribute('aria-selected', 'true');
        leftTabEl.classList.remove('active');
        leftTabEl.setAttribute('aria-selected', 'false');
      }
    }
  }

  // 2. Update URL pada Address Bar sesuai panel yang aktif
  let targetUrl = '';
  if (isSplitViewActive) {
    const sLeft = stores.find(s => s.id === activeStoreId);
    const sRight = stores.find(s => s.id === splitRightStoreId);
    const tLeft = storeTabs[activeStoreId]?.find(t => t.id === activeTabMap[activeStoreId]);
    const tRight = storeTabs[splitRightStoreId]?.find(t => t.id === splitRightTabId);

    const activeTabObj = (activeFocusedPane === 'right') ? tRight : tLeft;
    const activeStoreObj = (activeFocusedPane === 'right') ? sRight : sLeft;
    targetUrl = activeTabObj?.url || activeStoreObj?.url || '';
  } else {
    const store = stores.find(s => s.id === activeStoreId);
    const tab = storeTabs[activeStoreId]?.find(t => t.id === activeTabMap[activeStoreId]);
    targetUrl = tab?.url || store?.url || '';
  }

  const activeWv = typeof getActiveWebview === 'function' ? getActiveWebview() : null;
  if (activeWv && typeof activeWv.getURL === 'function') {
    try {
      const cur = activeWv.getURL();
      if (cur && cur !== 'about:blank') targetUrl = cur;
    } catch (e) {}
  }

  const addrInput = document.getElementById('tab-address-input');
  if (addrInput && document.activeElement !== addrInput && targetUrl) {
    addrInput.value = targetUrl;
  }

  // 3. Update status tombol navigasi Back / Forward
  if (typeof updateNavButtonStates === 'function') {
    updateNavButtonStates();
  }
}
window.updatePaneFocusUI = updatePaneFocusUI;

// ── Side-by-Side View Display Mode (Responsive Fit vs Horizontal Scroll) ─────
function setSplitDisplayMode(mode) {
  splitViewDisplayMode = mode === 'scroll' ? 'scroll' : 'responsive';
  try {
    localStorage.setItem('split_view_display_mode', splitViewDisplayMode);
  } catch (e) {}

  applySplitDisplayModeUI();

  if (splitViewDisplayMode === 'scroll') {
    showToast('📜 Mode: Scroll Horizontal (Tampilan Desktop Penuh)', 'info');
  } else {
    showToast('↔ Mode: Lebar Otomatis (Responsive Auto-Fit)', 'info');
  }

  if (window.AppTelemetry) {
    window.AppTelemetry.track('split_display_mode_changed', { mode: splitViewDisplayMode });
  }
}
window.setSplitDisplayMode = setSplitDisplayMode;

function toggleSplitDisplayMode() {
  const nextMode = splitViewDisplayMode === 'responsive' ? 'scroll' : 'responsive';
  setSplitDisplayMode(nextMode);
}
window.toggleSplitDisplayMode = toggleSplitDisplayMode;

function applySplitDisplayModeUI() {
  const wvContainer = document.getElementById('webview-container');
  if (wvContainer) {
    wvContainer.classList.remove('split-mode-responsive', 'split-mode-scroll');
    wvContainer.classList.add(`split-mode-${splitViewDisplayMode}`);
  }

  const iconResp = document.getElementById('split-mode-icon-responsive');
  const iconScroll = document.getElementById('split-mode-icon-scroll');
  const modeLabel = document.getElementById('split-mode-label');
  const toggleBtn = document.getElementById('btn-split-mode-toggle');

  const pickerModeIcon = document.getElementById('split-picker-mode-icon');
  const pickerModeText = document.getElementById('split-picker-mode-text');

  if (splitViewDisplayMode === 'scroll') {
    if (iconResp) iconResp.style.display = 'none';
    if (iconScroll) iconScroll.style.display = '';
    if (modeLabel) modeLabel.textContent = 'Scroll';
    if (toggleBtn) {
      toggleBtn.title = 'Mode saat ini: Scroll Horizontal (Klik untuk ubah ke Lebar Otomatis)';
      toggleBtn.classList.add('active');
    }
    if (pickerModeIcon) pickerModeIcon.textContent = '📜';
    if (pickerModeText) pickerModeText.textContent = 'Scroll';
  } else {
    if (iconResp) iconResp.style.display = '';
    if (iconScroll) iconScroll.style.display = 'none';
    if (modeLabel) modeLabel.textContent = 'Fit';
    if (toggleBtn) {
      toggleBtn.title = 'Mode saat ini: Lebar Otomatis (Klik untuk ubah ke Scroll Horizontal)';
      toggleBtn.classList.remove('active');
    }
    if (pickerModeIcon) pickerModeIcon.textContent = '↔';
    if (pickerModeText) pickerModeText.textContent = 'Fit';
  }
}
window.applySplitDisplayModeUI = applySplitDisplayModeUI;

// ── Update state tombol back/forward ─────────────────────────────────────────
function updateNavButtonStates() {
  const wv      = getActiveWebview();
  const backBtn = document.getElementById('btn-nav-back');
  const fwdBtn  = document.getElementById('btn-nav-forward');
  if (!backBtn || !fwdBtn) return;

  try {
    backBtn.disabled = !wv?.canGoBack();
    fwdBtn.disabled  = !wv?.canGoForward();
  } catch (e) {
    // Webview mungkin belum siap
  }
}

function addTab(storeId, url, title, loadOptions) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;
  const cfg   = ((typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[store.marketplace] : null) || MARKETPLACE_CONFIG.custom);
  const tabId = `tab-${generateId()}`;
  const targetUrl = url || store.url || cfg.url || 'https://www.google.com';

  const newTab = {
    id: tabId,
    title: title || 'Tab Baru',
    url: targetUrl,
    initialUrl: targetUrl,
    zoom: 1.0
  };

  if (loadOptions) {
    newTab.loadOptions = loadOptions;
    if (loadOptions.postBody) newTab.postBody = loadOptions.postBody;
    if (loadOptions.referrer) newTab.referrer = loadOptions.referrer;
  }

  const currentTabId = activeTabMap[storeId];
  const curIdx = storeTabs[storeId].findIndex(t => t.id === currentTabId);
  if (curIdx !== -1) {
    // Sisipkan tab tepat di sebelah tab yang sedang aktif
    storeTabs[storeId].splice(curIdx + 1, 0, newTab);
  } else {
    storeTabs[storeId].push(newTab);
  }

  saveStoreTabsState();
  switchTab(storeId, tabId);
  if (window.AppTelemetry) {
    window.AppTelemetry.track('tab_created');
  }
  if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
    window.OnboardingManager.notifyAction('open_tab');
  }
  return newTab;
}

// Buka URL sebagai tab baru — dipanggil dari Ctrl+Click, new-window event, atau window.open
function openUrlInNewTab(store, urlOrPayload) {
  if (!urlOrPayload) return;
  if (!store || !store.id) return;

  let targetUrl = '';
  let loadOptions = null;

  if (typeof urlOrPayload === 'string') {
    targetUrl = urlOrPayload.trim();
  } else if (typeof urlOrPayload === 'object') {
    targetUrl = (urlOrPayload.url || '').trim();
    if (urlOrPayload.postBody || urlOrPayload.referrer) {
      loadOptions = {
        postBody: urlOrPayload.postBody,
        referrer: urlOrPayload.referrer,
        disposition: urlOrPayload.disposition
      };
    }
  }

  if (!targetUrl) return;
  if (!storeTabs[store.id]) ensureStoreTabs(store);

  let tabTitle = 'Tab Baru';
  if (targetUrl === 'about:blank') {
    tabTitle = 'Memuat…';
  } else if (targetUrl.length > 40) {
    tabTitle = targetUrl.substring(0, 38) + '…';
  } else {
    tabTitle = targetUrl;
  }

  return addTab(store.id, targetUrl, tabTitle, loadOptions);
}
window.openUrlInNewTab = openUrlInNewTab;

function destroyWebview(tabId) {
  if (!tabId || !webviewMap[tabId]) return;
  const entry = webviewMap[tabId];
  if (entry.webview) {
    try {
      if (typeof entry.webview.stop === 'function') entry.webview.stop();
      if (typeof entry.webview.setAudioMuted === 'function') entry.webview.setAudioMuted(true);
      entry.webview.src = 'about:blank';
    } catch (e) {}
    try {
      entry.webview.remove();
    } catch (e) {}
  }
  if (entry.loading) {
    try {
      entry.loading.remove();
    } catch (e) {}
  }
  delete webviewMap[tabId];
  delete lastAccessed[tabId];
}
window.destroyWebview = destroyWebview;

function closeTab(storeId, tabId) {
  const tabs = storeTabs[storeId];
  if (!tabs || tabs.length <= 1) {
    showToast('Tidak bisa menutup tab terakhir.', 'error');
    return;
  }

  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;

  // Hancurkan webview secara bersih dan bebaskan V8 resource
  destroyWebview(tabId);

  storeTabs[storeId] = tabs.filter(t => t.id !== tabId);
  saveStoreTabsState();

  // Switch to adjacent tab if closing the active one
  if (activeTabMap[storeId] === tabId) {
    const newIdx = Math.min(idx, storeTabs[storeId].length - 1);
    const newTabId = storeTabs[storeId][newIdx].id;
    activeTabMap[storeId] = newTabId;
    showTab(storeId, newTabId);
  }

  renderTabBar();
  if (window.AppTelemetry) {
    window.AppTelemetry.track('tab_closed');
  }
}

function switchTab(storeId, tabId) {
  // Tutup & isolasi Find in Page saat berpindah tab
  if (activeTabMap[storeId] !== tabId && typeof closeFindInPage === 'function') {
    closeFindInPage({ skipFocus: true });
  }

  // Hide previous active webview
  const prevTabId = activeTabMap[storeId];
  if (prevTabId && prevTabId !== tabId && webviewMap[prevTabId] && !webviewMap[prevTabId].hibernated) {
    if (!isSplitViewActive || prevTabId !== splitRightTabId) {
      webviewMap[prevTabId].webview?.classList.remove('visible');
      if (webviewMap[prevTabId].loading) webviewMap[prevTabId].loading.style.display = 'none';
    }
  }

  activeTabMap[storeId] = tabId;
  lastAccessed[tabId]   = Date.now();
  saveStoreTabsState();
  showTab(storeId, tabId);
  renderTabBar();
}

function showTab(storeId, tabId) {
  const store = stores.find(s => s.id === storeId);
  const tab   = storeTabs[storeId]?.find(t => t.id === tabId);
  if (!store || !tab) return;

  const leftPane = document.getElementById('split-pane-left') || webviewCont;

  // Sembunyikan webview lain yang ada di leftPane
  if (leftPane) {
    leftPane.querySelectorAll('webview.store-webview').forEach(el => {
      el.classList.remove('visible');
      el.style.display = 'none';
    });
  }

  lastAccessed[tabId] = Date.now();

  if (window.DiagnosticLogger && typeof window.DiagnosticLogger.addBreadcrumb === 'function') {
    window.DiagnosticLogger.addBreadcrumb('TAB_SWITCH', `Buka tab "${tab.title || 'Tab'}" (${(tab.url || '').substring(0, 50)})`, {
      storeId: store.id,
      tabId: tab.id,
      url: tab.url
    });
  }

  const entry = webviewMap[tabId];

  // Cek apakah webview sudah mati/crashed saat di background
  const isCrashedOrDead = !entry || entry.isCrashed || !entry.webview || !entry.webview.isConnected || (typeof entry.webview.isCrashed === 'function' && entry.webview.isCrashed());

  if (entry?.hibernated) {
    if (entry.webview && !isCrashedOrDead) {
      // Pastikan elemen berada di leftPane jika sebelumnya ada di right pane
      if (leftPane && !leftPane.contains(entry.webview)) {
        leftPane.appendChild(entry.webview);
        if (entry.loading) leftPane.appendChild(entry.loading);
      }
      entry.webview.style.display = '';
      entry.webview.classList.add('visible');
      if (entry.loading) {
        entry.loading.classList.add('hidden');
        entry.loading.style.display = 'none';
      }
      entry.hibernated = false;
      if (typeof entry.webview.setAudioMuted === 'function') {
        try { entry.webview.setAudioMuted(false); } catch (e) { }
      }
      renderTabBar();
      if (typeof renderSidebar === 'function') renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
      return;
    } else {
      // Hard wake or dead webview recovery: reconstruct it cleanly
      if (entry) {
        try { entry.webview?.remove(); } catch (e) {}
        try { entry.loading?.remove(); } catch (e) {}
        delete webviewMap[tabId];
      }
      createWebview(store, tab, 'left');
      if (typeof manageHotWebviewPool === 'function') manageHotWebviewPool();
      renderTabBar();
      if (typeof renderSidebar === 'function') renderSidebar(typeof getFilteredStores === 'function' ? getFilteredStores() : stores);
      return;
    }
  }

  if (isCrashedOrDead) {
    console.warn(`[Self-Healing] Tab ${tab.id} webview was dead/absent in background. Re-instantiating...`);
    if (entry) {
      try { entry.webview?.remove(); } catch (e) {}
      try { entry.loading?.remove(); } catch (e) {}
      delete webviewMap[tabId];
    }
    createWebview(store, tab, 'left');
  } else {
    // Pastikan elemen berada di leftPane jika sebelumnya ada di right pane
    if (leftPane && !leftPane.contains(entry.webview)) {
      leftPane.appendChild(entry.webview);
      if (entry.loading) leftPane.appendChild(entry.loading);
    }
    entry.webview.style.display = '';
    entry.webview.classList.add('visible');
    if (entry.loading) {
      entry.loading.style.display = '';
    }
    if (tab.zoom && tab.zoom !== 1.0) {
      try {
        entry.webview.setZoomFactor(tab.zoom);
      } catch (e) {}
    }
  }
}

// ── Retry Tab ─────────────────────────────────────────────────────────────────
function retryTab(storeId, tabId) {
  const store = stores.find(s => s.id === storeId);
  const tab   = storeTabs[storeId]?.find(t => t.id === tabId);
  if (!store || !tab || !webviewMap[tabId]) return;
  if (window.AppTelemetry) {
    window.AppTelemetry.track('tab_error_reloaded');
  }
  webviewMap[tabId].webview.setAttribute('src', tab.url);
  if (webviewMap[tabId].loading) {
    webviewMap[tabId].loading.innerHTML = `<div class="spinner"></div><p>Memuat ulang...</p>`;
    webviewMap[tabId].loading.classList.remove('hidden');
  }
}
window.retryTab = retryTab;

// ── App.Tabs Module Interface ───────────────────────────────────────────────
window.App = window.App || {};
window.App.Tabs = {
  activateStore,
  render: renderTabBar,
  addTab,
  closeTab,
  destroyWebview,
  switchTab,
  showTab,
  createWebview,
  getActiveWebview,
  openUrlInNewTab,
  saveTabsState: saveStoreTabsState,
  retryTab
};

