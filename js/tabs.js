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
}

// ── Tab System ────────────────────────────────────────────────────────────────

function ensureStoreTabs(store) {
  if (!storeTabs[store.id]) {
    const cfg = MARKETPLACE_CONFIG[store.marketplace] || MARKETPLACE_CONFIG.custom;
    const tabId = `tab-${generateId()}`;
    storeTabs[store.id] = [{
      id: tabId,
      title: 'Chat',
      url: store.url || cfg.url,
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

  const cfg      = MARKETPLACE_CONFIG[store.marketplace] || MARKETPLACE_CONFIG.custom;
  const tabs     = storeTabs[activeStoreId];
  const curTabId = activeTabMap[activeStoreId];
  const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
  const bgStyle  = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';

  // Nav controls (kiri) + tabs (tengah) + add button (kanan)
  const navHtml = `
    <div class="tab-nav-controls">
      <button class="tab-nav-btn" id="btn-nav-back" title="Kembali (Alt+←)" aria-label="Kembali">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-forward" title="Maju (Alt+→)" aria-label="Maju">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-refresh" title="Refresh (F5)" aria-label="Refresh">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>
    </div>
    <div class="tab-nav-separator"></div>`;

  const leafIcon = '&#x1F343;';
  const tabsHtml = tabs.map(tab => {
    const isHibernated = webviewMap[tab.id]?.hibernated;
    const isCurTab = tab.id === curTabId;
    return `
    <div class="tab-item ${isCurTab ? 'active' : ''} ${isHibernated ? 'hibernated' : ''}" data-tab-id="${tab.id}" title="${isHibernated ? escapeHtml(tab.title) + ' (Tidur)' : escapeHtml(tab.title)}">
      <div class="tab-favicon-mini ${cfg.faviconClass}" ${bgStyle}>${isHibernated ? leafIcon : escapeHtml(initials.substring(0, 2))}</div>
      <span class="tab-title">${escapeHtml(tab.title)}</span>
      ${!isHibernated && !isCurTab ? `<button class="tab-hibernate-btn" data-tab-id="${tab.id}" title="Hibernasi tab ini" aria-label="Hibernasi tab ini">&#x1F343;</button>` : ''}
      <button class="tab-close" data-tab-id="${tab.id}" title="Tutup tab" aria-label="Tutup tab">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`;
  }).join('');

  const addBtnHtml = `
    <button class="tab-add-btn" id="btn-add-tab" title="Buka tab baru untuk ${escapeHtml(store.name)}" aria-label="Buka tab baru untuk ${escapeHtml(store.name)}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>`;

  tabBar.innerHTML = navHtml + tabsHtml + addBtnHtml;
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

  // Bind tab click (not close)
  tabBar.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', e => {
      if (!e.target.closest('.tab-close') && !e.target.closest('.tab-hibernate-btn')) {
        switchTab(activeStoreId, el.dataset.tabId);
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
  const cfg   = MARKETPLACE_CONFIG[store.marketplace] || MARKETPLACE_CONFIG.custom;
  const tabId = `tab-${generateId()}`;

  storeTabs[storeId].push({
    id: tabId,
    title: title || 'Tab Baru',
    url: url || store.url || cfg.url,
    zoom: 1.0
  });

  switchTab(storeId, tabId);
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
      webviewMap[tabId].webview?.setZoomFactor(tab.zoom);
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
