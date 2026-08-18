// ── Activate Store (Switch Panel) ─────────────────────────────────────────────
function activateStore(storeId) {
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
  renderSidebar(getFilteredStores());

  // Sinkronkan clipboard global & templates ke webview toko yang baru aktif
  if (typeof broadcastTemplatesToWebviews === 'function') {
    broadcastTemplatesToWebviews();
  }
}

// ── Tab System ────────────────────────────────────────────────────────────────

function ensureStoreTabs(store) {
  if (!storeTabs[store.id]) {
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
  }
}

function renderTabBar() {
  if (!activeStoreId || !storeTabs[activeStoreId]) {
    tabBar.style.display = 'none';
    return;
  }

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

  // Nav controls (kiri) + Mini Address Bar + tabs (tengah) + add button (kanan)
  const navHtml = `
    <div class="tab-nav-controls">
      <button class="tab-nav-btn" id="btn-nav-back" title="Kembali (Alt+\u2190)" aria-label="Kembali">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-forward" title="Maju (Alt+\u2192)" aria-label="Maju">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-refresh" title="Refresh (F5)" aria-label="Refresh">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-home" title="Beranda Toko (Kembali ke URL Awal)" aria-label="Beranda Toko">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </button>
    </div>
    <div class="tab-address-bar-wrap" id="tab-address-bar-wrap" title="Ketik URL (e.g. cekresi.com, maps, atau link produk)">
      <div class="tab-address-icon" id="tab-address-icon">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <input type="text" class="tab-address-input" id="tab-address-input" placeholder="Ketik URL / cari web..." autocomplete="off" spellcheck="false" value="${escapeHtml(activeTabUrl)}">
      <button class="tab-address-btn-go" id="btn-tab-address-go" title="Buka URL (Enter)" aria-label="Buka URL">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
    <div class="tab-nav-separator"></div>
    <div class="tab-items-container">`;

  const leafIcon = '&#x1F343;';
  const tabsHtml = tabs.map(tab => {
    const entry = webviewMap[tab.id];
    const isHibernated = entry?.hibernated;
    const isSyncing = entry?.isSyncing;
    const syncProgress = entry?.syncProgress;
    const isCurTab = tab.id === curTabId;

    let syncBadgeHtml = '';
    if (isSyncing) {
      const hasPercent = typeof syncProgress === 'number' && !isNaN(syncProgress) && syncProgress >= 0;
      const progStr = hasPercent ? ` ${syncProgress}%` : '';
      const tooltipMsg = hasPercent ? `Sedang menyinkronkan chat (${syncProgress}%)` : 'Sedang menyinkronkan chat...';
      syncBadgeHtml = `
        <span class="tab-sync-badge" title="${tooltipMsg}">
          <svg class="sync-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>${progStr}
        </span>`;
    }

    const hasPercent = typeof syncProgress === 'number' && !isNaN(syncProgress) && syncProgress >= 0;
    const tabTooltip = isSyncing 
      ? (hasPercent ? `Sedang menyinkronkan chat (${syncProgress}%)` : 'Sedang menyinkronkan chat...') 
      : (isHibernated ? escapeHtml(tab.title) + ' (Tidur)' : escapeHtml(tab.title));

    return `
    <div class="tab-item ${isCurTab ? 'active' : ''} ${isHibernated ? 'hibernated' : ''} ${isSyncing ? 'syncing' : ''}" data-tab-id="${tab.id}" title="${tabTooltip}">
      <div class="tab-favicon-mini ${cfg.faviconClass}" ${bgStyle}>${isHibernated ? leafIcon : escapeHtml(initials.substring(0, 2))}</div>
      <span class="tab-title">${escapeHtml(tab.title)}</span>
      ${syncBadgeHtml}
      ${!isHibernated && !isCurTab && !isSyncing ? `<button class="tab-hibernate-btn" data-tab-id="${tab.id}" title="Hibernasi tab ini" aria-label="Hibernasi tab">&#x1F343;</button>` : ''}
      <button class="tab-close" data-tab-id="${tab.id}" title="Tutup tab" aria-label="Tutup tab">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" focusable="false">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`;
  }).join('');

  const addBtnHtml = `
    <button class="tab-add-btn" id="btn-add-tab" title="Buka tab baru untuk ${escapeHtml(store.name)}" aria-label="Buka tab baru">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  </div>`;

  const fullHtml = navHtml + tabsHtml + addBtnHtml;
  if (tabBar.dataset.lastHtml === fullHtml && tabBar.style.display === 'flex') {
    updateNavButtonStates();
    return;
  }
  tabBar.dataset.lastHtml = fullHtml;
  tabBar.innerHTML = fullHtml;
  tabBar.style.display = 'flex';

  // Bind nav buttons
  document.getElementById('btn-nav-back')?.addEventListener('click', () => {
    const wv = getActiveWebview();
    if (wv?.canGoBack()) wv.goBack();
  });
  document.getElementById('btn-nav-forward')?.addEventListener('click', () => {
    const wv = getActiveWebview();
    if (wv?.canGoForward()) wv.goForward();
  });
  document.getElementById('btn-nav-refresh')?.addEventListener('click', () => {
    getActiveWebview()?.reload();
  });
  document.getElementById('btn-nav-home')?.addEventListener('click', () => {
    const store = stores.find(s => s.id === activeStoreId);
    const cfg = store ? ((typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[store.marketplace] : null) || MARKETPLACE_CONFIG.custom) : null;
    const tabEntry = storeTabs[activeStoreId]?.find(t => t.id === activeTabMap[activeStoreId]);
    const homeUrl = tabEntry?.initialUrl || store?.url || cfg?.url || '';
    if (homeUrl) {
      const wv = getActiveWebview();
      if (wv) {
        try {
          wv.loadURL(homeUrl);
        } catch (e) {
          wv.src = homeUrl;
        }
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
    }
  });
  addrInput?.addEventListener('focus', () => {
    setTimeout(() => addrInput.select(), 50);
  });

  // Bind tab click (not close)
  tabBar.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', e => {
      if (!e.target.closest('.tab-close') && !e.target.closest('.tab-hibernate-btn') && !e.target.closest('.tab-sync-badge')) {
        switchTab(activeStoreId, el.dataset.tabId);
      }
    });
  });

  // Bind click pada badge sinkronisasi untuk membuka modal info edukasi
  tabBar.querySelectorAll('.tab-sync-badge').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof openWaSyncEduModal === 'function') {
        openWaSyncEduModal();
      }
    });
  });

  // Bind hibernate buttons
  tabBar.querySelectorAll('.tab-hibernate-btn').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const storeId = Object.keys(storeTabs).find(sid =>
        storeTabs[sid].some(t => t.id === el.dataset.tabId)
      );
      if (storeId) hibernateTab(storeId, el.dataset.tabId);
    });
  });

  // Bind close buttons
  tabBar.querySelectorAll('.tab-close').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      closeTab(activeStoreId, el.dataset.tabId);
    });
  });

  // Bind add tab button
  document.getElementById('btn-add-tab')?.addEventListener('click', () => addTab(activeStoreId));

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
    try {
      wv.loadURL(targetUrl);
    } catch (e) {
      wv.src = targetUrl;
    }
  }
}
window.navigateFromAddressBar = navigateFromAddressBar;

// ── Helper: ambil webview aktif saat ini ──────────────────────────────────────
function getActiveWebview() {
  if (!activeStoreId) return null;
  const tabId = activeTabMap[activeStoreId];
  if (!tabId) return null;
  return webviewMap[tabId]?.webview || null;
}

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

function addTab(storeId, url, title) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;
  const cfg   = ((typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[store.marketplace] : null) || MARKETPLACE_CONFIG.custom);
  const tabId = `tab-${generateId()}`;
  const targetUrl = url || store.url || cfg.url || 'https://www.google.com';

  storeTabs[storeId].push({
    id: tabId,
    title: title || 'Tab Baru',
    url: targetUrl,
    initialUrl: targetUrl,
    zoom: 1.0
  });

  switchTab(storeId, tabId);
  if (window.OnboardingManager && typeof window.OnboardingManager.notifyAction === 'function') {
    window.OnboardingManager.notifyAction('open_tab');
  }
}

// Buka URL sebagai tab baru — dipanggil dari Ctrl+Click atau new-window event
function openUrlInNewTab(store, url) {
  if (!url || url === 'about:blank') return;
  if (!storeTabs[store.id]) ensureStoreTabs(store);
  addTab(store.id, url, url.length > 40 ? url.substring(0, 38) + '…' : url);
}

function closeTab(storeId, tabId) {
  const tabs = storeTabs[storeId];
  if (!tabs || tabs.length <= 1) {
    showToast('Tidak bisa menutup tab terakhir.', 'error');
    return;
  }

  const idx = tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return;

  // Remove webview DOM element
  if (webviewMap[tabId]) {
    webviewMap[tabId].webview?.remove();
    webviewMap[tabId].loading?.remove();
    delete webviewMap[tabId];
  }
  delete lastAccessed[tabId];

  storeTabs[storeId] = tabs.filter(t => t.id !== tabId);

  // Switch to adjacent tab if closing the active one
  if (activeTabMap[storeId] === tabId) {
    const newIdx = Math.min(idx, storeTabs[storeId].length - 1);
    const newTabId = storeTabs[storeId][newIdx].id;
    activeTabMap[storeId] = newTabId;
    showTab(storeId, newTabId);
  }

  renderTabBar();
}

function switchTab(storeId, tabId) {
  // Hide previous active webview (skip if hibernated)
  const prevTabId = activeTabMap[storeId];
  if (prevTabId && webviewMap[prevTabId] && !webviewMap[prevTabId].hibernated) {
    webviewMap[prevTabId].webview?.classList.remove('visible');
    if (webviewMap[prevTabId].loading) webviewMap[prevTabId].loading.style.display = 'none';
  }

  activeTabMap[storeId] = tabId;
  lastAccessed[tabId]   = Date.now();
  showTab(storeId, tabId);
  renderTabBar();
}

function showTab(storeId, tabId) {
  const store = stores.find(s => s.id === storeId);
  const tab   = storeTabs[storeId]?.find(t => t.id === tabId);
  if (!store || !tab) return;

  // Batalkan pending background ping untuk tab ini jika ada
  if (typeof cancelPendingPing === 'function') {
    cancelPendingPing(tabId);
  }

  lastAccessed[tabId] = Date.now();

  if (webviewMap[tabId]?.hibernated) {
    const entry = webviewMap[tabId];
    if (entry.webview) {
      // Soft wake: webview is still in DOM, just hidden
      entry.webview.style.display = '';
      entry.webview.classList.add('visible');
      if (entry.loading) entry.loading.style.display = '';
      entry.hibernated = false;
      renderTabBar();
      renderSidebar(getFilteredStores());
      return;
    } else {
      // Hard wake: webview was destroyed to save RAM, reconstruct it
      webviewMap[tabId].hibernated = false;
      delete webviewMap[tabId]; // Clean up stub
      createWebview(store, tab);
      renderTabBar();
      renderSidebar(getFilteredStores());
      return;
    }
  }

  if (!webviewMap[tabId]) {
    createWebview(store, tab);
  } else {
    webviewMap[tabId].webview?.classList.add('visible');
    if (webviewMap[tabId].loading) {
      webviewMap[tabId].loading.style.display = '';
    }
    if (tab.zoom && tab.zoom !== 1.0) {
      try {
        webviewMap[tabId].webview?.setZoomFactor(tab.zoom);
      } catch (e) {}
    }
  }
}

// ── Retry Tab ─────────────────────────────────────────────────────────────────
function retryTab(storeId, tabId) {
  const store = stores.find(s => s.id === storeId);
  const tab   = storeTabs[storeId]?.find(t => t.id === tabId);
  if (!store || !tab || !webviewMap[tabId]) return;
  webviewMap[tabId].webview.setAttribute('src', tab.url);
  if (webviewMap[tabId].loading) {
    webviewMap[tabId].loading.innerHTML = `<div class="spinner"></div><p>Memuat ulang...</p>`;
    webviewMap[tabId].loading.classList.remove('hidden');
  }
}
