/* =============================================
   CS MARKETPLACE DASHBOARD — RENDERER
   Logika UI: Sidebar, Tab System, Webview, Modal
   ============================================= */

// ── Marketplace Config ───────────────────────────────────────────────────────
const MARKETPLACE_CONFIG = {
  shopee: {
    label: 'Shopee',
    url: 'https://seller.shopee.co.id/portal/chat',
    emoji: '🛍️',
    faviconClass: 'favicon-shopee',
    groupColor: '#f5521d'
  },
  tokopedia: {
    label: 'Tokopedia',
    url: 'https://seller.tokopedia.com/chat',
    emoji: '🟢',
    faviconClass: 'favicon-tokopedia',
    groupColor: '#03ac0e'
  },
  lazada: {
    label: 'Lazada',
    url: 'https://sellercenter.lazada.co.id/apps/seller/chat',
    emoji: '🔵',
    faviconClass: 'favicon-lazada',
    groupColor: '#0f146b'
  },
  tiktok: {
    label: 'TikTok Shop',
    url: 'https://seller-id.tiktok.com/message',
    emoji: '⬛',
    faviconClass: 'favicon-tiktok',
    groupColor: '#ffffff'
  },
  blibli: {
    label: 'Blibli',
    url: 'https://seller.blibli.com/backend/chat',
    emoji: '🔷',
    faviconClass: 'favicon-blibli',
    groupColor: '#0190d0'
  },
  bukalapak: {
    label: 'Bukalapak',
    url: 'https://seller.bukalapak.com/message',
    emoji: '🔴',
    faviconClass: 'favicon-bukalapak',
    groupColor: '#e12b2b'
  },
  custom: {
    label: 'Custom',
    url: '',
    emoji: '⚙️',
    faviconClass: 'favicon-custom',
    groupColor: '#6366f1'
  }
};

// ── State ────────────────────────────────────────────────────────────────────
let stores        = [];
let activeStoreId = null;
let sidebarCollapsed = false;
let appPath       = ''; // Path ke direktori app (untuk webview preload)

// Tab system: per-store tab list & active tab tracking
// storeTabs:    storeId → [{ id, title, url, zoom }]
// activeTabMap: storeId → tabId
// webviewMap:   tabId   → { webview: el, loading: el, hibernated: bool }
const storeTabs   = {};
const activeTabMap = {};
const webviewMap  = {};

// Zoom indicator timer
let zoomIndicatorTimer = null;

// Edit modal state
let editingStoreId = null;

// ── RAM Hibernation Config ─────────────────────────────────────────────────────
const RAM_THRESHOLD_MB = 2048;  // 2 GB — hibernate otomatis di atas ini
const RAM_CHECK_INTERVAL_MS = 8000; // Cek setiap 8 detik
const lastAccessed = {};    // tabId → timestamp ms (kapan terakhir dilihat)
let   ramUsageMB   = 0;

// ── DOM Elements ─────────────────────────────────────────────────────────────
const sidebarEl      = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebar-content');
const webviewCont    = document.getElementById('webview-container');
const emptyState     = document.getElementById('empty-state');
const tabBar         = document.getElementById('tab-bar');
const searchInput    = document.getElementById('search-input');

// Modals
const modalOverlay       = document.getElementById('modal-overlay');
const modalTitle         = document.getElementById('modal-title');
const settingsOverlay    = document.getElementById('settings-overlay');
const storesListSettings = document.getElementById('settings-stores-list');

// Form fields
const fieldStoreId          = document.getElementById('store-id');
const fieldStoreName        = document.getElementById('store-name');
const fieldStoreInitials    = document.getElementById('store-initials');
const fieldStoreMarketplace = document.getElementById('store-marketplace');
const fieldStoreUrl         = document.getElementById('store-url');
const fieldStoreColor       = document.getElementById('store-color');
const colorPickerWrapper    = document.getElementById('color-picker-wrapper');
const customUrlGroup        = document.getElementById('custom-url-group');
const urlPreview            = document.getElementById('url-preview');

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  appPath = await window.electronAPI.getAppPath();
  stores  = await window.electronAPI.getStores();
  renderSidebar(stores);
  bindEvents();

  // Mulai monitor RAM dan hibernate otomatis
  setInterval(checkAndHibernateIfNeeded, RAM_CHECK_INTERVAL_MS);
  checkAndHibernateIfNeeded(); // langsung cek pertama kali
}

// ── Sidebar Collapse ──────────────────────────────────────────────────────────
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  sidebarEl.classList.toggle('collapsed', sidebarCollapsed);
}

// ── Render Sidebar ───────────────────────────────────────────────────────────
function renderSidebar(filteredStores) {
  if (filteredStores.length === 0) {
    sidebarContent.innerHTML = `<div class="no-stores-msg">Belum ada toko.<br>Klik <strong>+ Tambah Toko</strong> untuk memulai.</div>`;
    return;
  }

  // Group by marketplace
  const groups = {};
  filteredStores.forEach(store => {
    if (!groups[store.marketplace]) groups[store.marketplace] = [];
    groups[store.marketplace].push(store);
  });

  let html = '';
  for (const [mp, mpStores] of Object.entries(groups)) {
    const cfg = MARKETPLACE_CONFIG[mp] || MARKETPLACE_CONFIG.custom;
    html += `<div class="store-group">
      <div class="store-group-header">
        <div class="store-group-dot" style="background:${cfg.groupColor}"></div>
        ${cfg.label}
      </div>`;
    mpStores.forEach(store => {
      const isActive = store.id === activeStoreId;
      const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
      const bgStyle  = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';
      const storeTabList = storeTabs[store.id] || [];
      const allHibernated = storeTabList.length > 0 && storeTabList.every(t => webviewMap[t.id]?.hibernated);
      const leafBadge = '<span class="hibernate-badge">&#x1F343;</span>';
      html += `
        <div class="store-item ${isActive ? 'active' : ''} ${allHibernated ? 'hibernated' : ''}" data-id="${store.id}" title="${escapeHtml(store.name)}${allHibernated ? ' (Tidur)' : ''}">
          <div class="store-favicon ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}${allHibernated ? leafBadge : ''}</div>
          <div class="store-info">
            <div class="store-name">${escapeHtml(store.name)}</div>
            <div class="store-marketplace-label">${cfg.label}${allHibernated ? ' &middot; Tidur' : ''}</div>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  sidebarContent.innerHTML = html;

  sidebarContent.querySelectorAll('.store-item').forEach(el => {
    el.addEventListener('click', () => activateStore(el.dataset.id));
  });
}

// ── Activate Store (Switch Panel) ─────────────────────────────────────────────
function activateStore(storeId) {
  // Hide all currently visible webviews
  Object.keys(webviewMap).forEach(tabId => {
    webviewMap[tabId].webview?.classList.remove('visible');
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
      <button class="tab-nav-btn" id="btn-nav-back" title="Kembali (Alt+\u2190)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-forward" title="Maju (Alt+\u2192)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
      <button class="tab-nav-btn" id="btn-nav-refresh" title="Refresh (F5)">
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
    return `
    <div class="tab-item ${tab.id === curTabId ? 'active' : ''} ${isHibernated ? 'hibernated' : ''}" data-tab-id="${tab.id}" title="${isHibernated ? escapeHtml(tab.title) + ' (Tidur)' : escapeHtml(tab.title)}">
      <div class="tab-favicon-mini ${cfg.faviconClass}" ${bgStyle}>${isHibernated ? leafIcon : escapeHtml(initials.substring(0, 2))}</div>
      <span class="tab-title">${escapeHtml(tab.title)}</span>
      <button class="tab-close" data-tab-id="${tab.id}" title="Tutup tab">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`;
  }).join('');

  const addBtnHtml = `
    <button class="tab-add-btn" id="btn-add-tab" title="Buka tab baru untuk ${escapeHtml(store.name)}">
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
      if (!e.target.closest('.tab-close')) {
        switchTab(activeStoreId, el.dataset.tabId);
      }
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
      webviewMap[tabId].loading.classList.add('hidden');
    }
    if (tab.zoom && tab.zoom !== 1.0) {
      webviewMap[tabId].webview?.setZoomFactor(tab.zoom);
    }
  }
}

// ── Hibernation System ─────────────────────────────────────────────────────────

function hibernateTab(storeId, tabId) {
  const wvEntry = webviewMap[tabId];
  if (!wvEntry || wvEntry.hibernated || !wvEntry.webview) return;

  if (wvEntry.hasDraft) {
    // Soft hibernate: user is typing something, keep DOM to prevent data loss
    wvEntry.webview.style.display = 'none';
    if (wvEntry.loading) wvEntry.loading.style.display = 'none';
  } else {
    // Hard hibernate: Hapus dari DOM untuk benar-benar membebaskan RAM
    wvEntry.webview.remove();
    if (wvEntry.loading) wvEntry.loading.remove();
    delete wvEntry.webview;
    delete wvEntry.loading;
  }
  
  wvEntry.hibernated = true;

  // Update UI
  if (activeStoreId === storeId) renderTabBar();
  renderSidebar(getFilteredStores());
}

async function checkAndHibernateIfNeeded() {
  try {
    ramUsageMB = await window.electronAPI.getAppMemoryMB();
    updateRamIndicator(ramUsageMB);

    if (ramUsageMB < RAM_THRESHOLD_MB) return;

    // Cari kandidat: webview aktif yang BUKAN tab aktif saat ini
    const activeTabId = activeStoreId ? activeTabMap[activeStoreId] : null;

    const candidates = [];
    for (const [tabId, entry] of Object.entries(webviewMap)) {
      if (entry.hibernated || !entry.webview) continue;
      if (tabId === activeTabId) continue;
      candidates.push({ tabId, lastSeen: lastAccessed[tabId] || 0 });
    }

    if (candidates.length === 0) return;

    // Hibernate yang paling lama tidak diakses (LRU)
    candidates.sort((a, b) => a.lastSeen - b.lastSeen);
    const oldest  = candidates[0];
    const storeId = Object.keys(storeTabs).find(sid =>
      storeTabs[sid].some(t => t.id === oldest.tabId)
    );

    if (storeId) {
      const store = stores.find(s => s.id === storeId);
      const agoMs = Date.now() - oldest.lastSeen;
      const agoText = agoMs < 60000 ? 'baru saja' : `${Math.round(agoMs / 60000)} mnt lalu`;
      showToast(`Hibernasi: "${store?.name || ''}" (diakses ${agoText}) — RAM ${Math.round(ramUsageMB / 1024 * 10) / 10} GB`, '');
      hibernateTab(storeId, oldest.tabId);
    }
  } catch (e) {
    // Tidak kritis, abaikan
  }
}

function updateRamIndicator(mb) {
  const indicator = document.getElementById('ram-indicator');
  const ramText   = document.getElementById('ram-text');
  if (!indicator || !ramText) return;

  ramText.textContent = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

  const pct = mb / RAM_THRESHOLD_MB;
  indicator.className = 'titlebar-ram';
  if (pct >= 0.9)       indicator.classList.add('danger');
  else if (pct >= 0.65) indicator.classList.add('warning');
}


// ── Create Webview ────────────────────────────────────────────────────────────
function createWebview(store, tab) {
  // Build absolute path to webview-preload.js (works dev & packaged)
  const preloadPath = appPath.replace(/\\/g, '/');
  const preloadUrl  = `file:///${preloadPath}/webview-preload.js`;

  // Loading overlay
  const loadingEl = document.createElement('div');
  loadingEl.className = 'webview-loading';
  loadingEl.innerHTML = `
    <div class="spinner"></div>
    <p>Membuka ${escapeHtml(store.name)}…</p>`;
  webviewCont.appendChild(loadingEl);

  // Webview element — semua tab dalam 1 toko berbagi partition (1 sesi login)
  const wv = document.createElement('webview');
  wv.className = 'store-webview visible';
  wv.setAttribute('src', tab.url);
  wv.setAttribute('partition', store.partition);
  wv.setAttribute('preload', preloadUrl);
  wv.setAttribute('allowpopups', '');
  wv.setAttribute('useragent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  // ── IPC: Ctrl+Click, Zoom, Nav dari webview-preload.js ──────────────────
  wv.addEventListener('ipc-message', (event) => {
    const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);

    if (event.channel === 'ctrl-click-link') {
      openUrlInNewTab(store, event.args[0]);

    } else if (event.channel === 'zoom-change') {
      if (!tabEntry) return;
      tabEntry.zoom = (tabEntry.zoom || 1.0) + event.args[0] * 0.1;
      tabEntry.zoom = Math.max(0.25, Math.min(4.0, parseFloat(tabEntry.zoom.toFixed(2))));
      wv.setZoomFactor(tabEntry.zoom);
      showZoomIndicator(Math.round(tabEntry.zoom * 100));

    } else if (event.channel === 'zoom-reset') {
      if (!tabEntry) return;
      tabEntry.zoom = 1.0;
      wv.setZoomFactor(1.0);
      showZoomIndicator(100);

    } else if (event.channel === 'nav-back') {
      if (wv.canGoBack()) wv.goBack();

    } else if (event.channel === 'nav-forward') {
      if (wv.canGoForward()) wv.goForward();

    } else if (event.channel === 'nav-refresh') {
      wv.reload();

    } else if (event.channel === 'draft-status') {
      if (webviewMap[tab.id]) webviewMap[tab.id].hasDraft = event.args[0];
    }
  });

  // ── new-window: target=_blank / window.open() → buka sebagai tab baru ────
  wv.addEventListener('new-window', (e) => {
    if (e.url && e.url !== 'about:blank') {
      openUrlInNewTab(store, e.url);
    }
  });

  // ── Auto-update tab title dari halaman ───────────────────────────────────
  wv.addEventListener('page-title-updated', e => {
    const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);
    if (tabEntry && e.title) {
      tabEntry.title = e.title.length > 30 ? e.title.substring(0, 28) + '…' : e.title;
      if (activeStoreId === store.id) renderTabBar();
    }
  });

  // ── Loading done & Nav state update ──────────────────────────────────────
  wv.addEventListener('did-finish-load', () => {
    loadingEl.classList.add('hidden');
    const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);
    if (tabEntry?.zoom && tabEntry.zoom !== 1.0) {
      wv.setZoomFactor(tabEntry.zoom);
    }
    // Update back/forward button states
    if (activeStoreId === store.id && activeTabMap[store.id] === tab.id) {
      updateNavButtonStates();
    }
  });

  // Update nav state saat navigasi dalam halaman (SPA routing)
  wv.addEventListener('did-navigate', () => {
    if (activeStoreId === store.id && activeTabMap[store.id] === tab.id) {
      updateNavButtonStates();
    }
  });

  wv.addEventListener('did-navigate-in-page', () => {
    if (activeStoreId === store.id && activeTabMap[store.id] === tab.id) {
      updateNavButtonStates();
    }
  });

  wv.addEventListener('did-fail-load', e => {
    if (e.errorCode !== -3) {
      loadingEl.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <p style="color:#fca5a5">Gagal memuat halaman.<br>
        <small style="color:#64748b">${escapeHtml(e.errorDescription || 'Periksa koneksi internet.')}</small></p>
        <button onclick="retryTab('${store.id}','${tab.id}')"
          style="margin-top:8px;padding:8px 16px;background:#6366f1;border:none;border-radius:8px;color:white;cursor:pointer;font-size:13px;">
          Coba Lagi
        </button>`;
    }
  });

  webviewCont.appendChild(wv);
  webviewMap[tab.id] = { webview: wv, loading: loadingEl };
}

// ── Zoom Indicator ─────────────────────────────────────────────────────────────
function showZoomIndicator(percent) {
  let indicator = document.getElementById('zoom-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'zoom-indicator';
    indicator.className = 'zoom-indicator';
    document.body.appendChild(indicator);
  }

  const isDefault = percent === 100;
  indicator.innerHTML = isDefault
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> ${percent}%`
    : `${percent > 100 ? '🔍+' : '🔍-'} ${percent}%`;

  indicator.classList.add('visible');
  clearTimeout(zoomIndicatorTimer);
  zoomIndicatorTimer = setTimeout(() => {
    indicator?.classList.remove('visible');
  }, 1800);
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

// ── Search / Filter ───────────────────────────────────────────────────────────
function getFilteredStores() {
  const q = searchInput.value.toLowerCase().trim();
  if (!q) return stores;
  return stores.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (MARKETPLACE_CONFIG[s.marketplace]?.label || '').toLowerCase().includes(q)
  );
}

// ── Modal: Add/Edit Store ─────────────────────────────────────────────────────
function openAddModal() {
  editingStoreId = null;
  modalTitle.textContent = 'Tambah Toko Baru';
  document.getElementById('btn-modal-save').textContent = 'Simpan Toko';
  fieldStoreId.value       = '';
  fieldStoreName.value     = '';
  fieldStoreInitials.value = '';
  fieldStoreUrl.value      = '';
  setSelectedMarketplace('shopee');
  setSelectedColor('');
  customUrlGroup.style.display = 'none';
  modalOverlay.classList.add('active');
  setTimeout(() => fieldStoreName.focus(), 200);
}

function openEditModal(storeId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  editingStoreId = storeId;
  modalTitle.textContent = 'Edit Toko';
  document.getElementById('btn-modal-save').textContent = 'Update Toko';

  fieldStoreId.value       = store.id;
  fieldStoreName.value     = store.name;
  fieldStoreInitials.value = store.initials || '';
  setSelectedMarketplace(store.marketplace);
  setSelectedColor(store.color || '');

  if (store.marketplace === 'custom') {
    fieldStoreUrl.value = store.url;
    customUrlGroup.style.display = 'flex';
  } else {
    customUrlGroup.style.display = 'none';
  }
  updateUrlPreview(store.marketplace, store.url);

  settingsOverlay.classList.remove('active');
  modalOverlay.classList.add('active');
  setTimeout(() => fieldStoreName.focus(), 200);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  editingStoreId = null;
}

function setSelectedMarketplace(value) {
  fieldStoreMarketplace.value = value;
  document.querySelectorAll('.mp-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.value === value);
  });
  updateUrlPreview(value, fieldStoreUrl.value);
}

function setSelectedColor(colorHex) {
  let found = false;
  document.querySelectorAll('.color-preset').forEach(el => {
    const match = (el.dataset.color || '').toLowerCase() === (colorHex || '').toLowerCase();
    el.classList.toggle('active', match);
    if (match) found = true;
  });
  if (colorHex && !found) {
    fieldStoreColor.value = colorHex;
  }
}

function getSelectedColor() {
  const activePreset = colorPickerWrapper.querySelector('.color-preset.active');
  if (activePreset) {
    return activePreset.dataset.color || '';
  }
  return fieldStoreColor.value || '';
}

function updateUrlPreview(marketplace, customUrl) {
  const cfg = MARKETPLACE_CONFIG[marketplace] || MARKETPLACE_CONFIG.custom;
  urlPreview.textContent = marketplace === 'custom'
    ? (customUrl || '(masukkan URL di atas)')
    : cfg.url;
}

async function saveStore() {
  const name        = fieldStoreName.value.trim();
  const initials    = fieldStoreInitials.value.trim().toUpperCase();
  const marketplace = fieldStoreMarketplace.value;
  const color       = getSelectedColor();

  if (!name) {
    fieldStoreName.focus();
    showToast('Nama toko tidak boleh kosong!', 'error');
    return;
  }

  const cfg = MARKETPLACE_CONFIG[marketplace] || MARKETPLACE_CONFIG.custom;
  let url   = marketplace === 'custom' ? fieldStoreUrl.value.trim() : cfg.url;

  if (marketplace === 'custom' && !url) {
    fieldStoreUrl.focus();
    showToast('Masukkan URL untuk marketplace custom!', 'error');
    return;
  }

  if (editingStoreId) {
    const idx = stores.findIndex(s => s.id === editingStoreId);
    if (idx !== -1) {
      stores[idx].name        = name;
      stores[idx].initials    = initials;
      stores[idx].marketplace = marketplace;
      stores[idx].url         = url;
      stores[idx].color       = color;
    }
  } else {
    const id = `${marketplace}-${Date.now()}`;
    stores.push({ id, name, initials, marketplace, url, color, partition: `persist:${id}` });
  }

  const ok = await window.electronAPI.saveStores(stores);
  if (ok) {
    closeModal();
    renderSidebar(getFilteredStores());
    renderTabBar();
    renderSettingsList();
    updateEmptyState();
    showToast(editingStoreId ? 'Toko berhasil diperbarui ✓' : 'Toko baru ditambahkan ✓', 'success');
  } else {
    showToast('Gagal menyimpan. Coba lagi.', 'error');
  }
}

async function deleteStore(storeId) {
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  const confirmed = confirm(`Hapus toko "${store.name}"?\n\nSesi login akan tetap tersimpan.`);
  if (!confirmed) return;

  // Remove all tab webviews for this store
  const tabs = storeTabs[storeId] || [];
  tabs.forEach(tab => {
    if (webviewMap[tab.id]) {
      webviewMap[tab.id].webview?.remove();
      webviewMap[tab.id].loading?.remove();
      delete webviewMap[tab.id];
    }
  });
  delete storeTabs[storeId];
  delete activeTabMap[storeId];

  if (activeStoreId === storeId) {
    activeStoreId = null;
    webviewCont.classList.remove('active');
    tabBar.style.display = 'none';
    updateEmptyState();
  }

  stores = stores.filter(s => s.id !== storeId);
  await window.electronAPI.saveStores(stores);
  renderSidebar(getFilteredStores());
  renderSettingsList();
  showToast('Toko dihapus.', 'success');
}

// ── Settings Modal ─────────────────────────────────────────────────────────────
function openSettings() {
  renderSettingsList();
  settingsOverlay.classList.add('active');
}

function renderSettingsList() {
  if (stores.length === 0) {
    storesListSettings.innerHTML = `<div class="no-stores-msg">Belum ada toko yang ditambahkan.</div>`;
    return;
  }
  storesListSettings.innerHTML = stores.map(store => {
    const cfg      = MARKETPLACE_CONFIG[store.marketplace] || MARKETPLACE_CONFIG.custom;
    const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
    const bgStyle  = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';
    return `
      <div class="settings-store-item">
        <div class="settings-store-favicon ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}</div>
        <div class="settings-store-info">
          <div class="settings-store-name">${escapeHtml(store.name)}</div>
          <div class="settings-store-url">${escapeHtml(store.url || cfg.url)}</div>
        </div>
        <div class="settings-store-actions">
          <button class="btn-icon" title="Edit" onclick="openEditModal('${store.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon danger" title="Hapus" onclick="deleteStore('${store.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── Empty State ───────────────────────────────────────────────────────────────
function updateEmptyState() {
  if (!activeStoreId) {
    emptyState.style.display = 'flex';
    webviewCont.classList.remove('active');
    tabBar.style.display = 'none';
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const toast   = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = 'toast', 3000);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// ── Bind All Events ───────────────────────────────────────────────────────────
function bindEvents() {
  // Window controls
  document.getElementById('btn-minimize').addEventListener('click', () => window.electronAPI.windowMinimize());
  document.getElementById('btn-maximize').addEventListener('click', () => window.electronAPI.windowMaximize());
  document.getElementById('btn-close').addEventListener('click', () => window.electronAPI.windowClose());

  // Sidebar collapse
  document.getElementById('btn-collapse-sidebar').addEventListener('click', toggleSidebar);

  // Add store buttons
  document.getElementById('btn-add-store').addEventListener('click', openAddModal);
  document.getElementById('btn-add-store-empty').addEventListener('click', openAddModal);
  document.getElementById('btn-settings').addEventListener('click', openSettings);

  // Search
  searchInput.addEventListener('input', () => renderSidebar(getFilteredStores()));

  // Marketplace picker
  document.querySelectorAll('.mp-option').forEach(el => {
    el.addEventListener('click', () => {
      const val = el.dataset.value;
      setSelectedMarketplace(val);
      customUrlGroup.style.display = val === 'custom' ? 'flex' : 'none';
    });
  });

  // Color picker events
  document.querySelectorAll('.color-preset').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
    });
  });

  fieldStoreColor.addEventListener('input', () => {
    document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
  });

  // Custom URL input
  fieldStoreUrl.addEventListener('input', () => updateUrlPreview('custom', fieldStoreUrl.value));

  // Store name — Enter to save
  fieldStoreName.addEventListener('keydown', e => { if (e.key === 'Enter') saveStore(); });

  // Modal close / save
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-modal-save').addEventListener('click', saveStore);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

  // Settings modal
  document.getElementById('settings-close').addEventListener('click', () => {
    settingsOverlay.classList.remove('active');
  });
  settingsOverlay.addEventListener('click', e => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove('active');
  });
  document.getElementById('btn-settings-add').addEventListener('click', () => {
    settingsOverlay.classList.remove('active');
    openAddModal();
  });
}

// ── Global helpers (untuk onclick inline di settings) ─────────────────────────
window.openEditModal = openEditModal;
window.deleteStore   = deleteStore;
window.retryTab      = retryTab;

// ── Scratchpad Logic ─────────────────────────────────────────────────────────
const btnScratchpad = document.getElementById('btn-scratchpad');
const scratchpadWindow = document.getElementById('scratchpad-window');
const scratchpadHeader = document.getElementById('scratchpad-header');
const scratchpadTabsContainer = document.getElementById('scratchpad-tabs');
const btnAddTab = document.getElementById('btn-add-tab');
const btnScratchpadClose = document.getElementById('btn-scratchpad-close');
const btnSpLoad = document.getElementById('btn-sp-load');
const btnSpSave = document.getElementById('btn-sp-save');
const spTextarea = document.getElementById('scratchpad-textarea');

let isScratchpadDragging = false;
let spDragOffsetX = 0;
let spDragOffsetY = 0;

// Scratchpad tabs state
let scratchpadTabs = [];
let activeScratchpadTabId = null;

function loadScratchpadState() {
  const saved = localStorage.getItem('scratchpadTabs');
  if (saved) {
    try {
      scratchpadTabs = JSON.parse(saved);
    } catch(e) {}
  }
  
  if (!scratchpadTabs || scratchpadTabs.length === 0) {
    scratchpadTabs = [
      { id: 'tab-' + Date.now(), name: 'Catatan 1', content: '' }
    ];
  }
  
  const savedActive = localStorage.getItem('activeScratchpadTabId');
  if (savedActive && scratchpadTabs.find(t => t.id === savedActive)) {
    activeScratchpadTabId = savedActive;
  } else {
    activeScratchpadTabId = scratchpadTabs[0].id;
  }
}

function saveScratchpadState() {
  localStorage.setItem('scratchpadTabs', JSON.stringify(scratchpadTabs));
  localStorage.setItem('activeScratchpadTabId', activeScratchpadTabId);
}

loadScratchpadState();

function renderScratchpadTabs() {
  scratchpadTabsContainer.innerHTML = '';
  scratchpadTabs.forEach((tab, index) => {
    const tabEl = document.createElement('div');
    tabEl.className = 'scratchpad-tab' + (tab.id === activeScratchpadTabId ? ' active' : '');
    
    const titleEl = document.createElement('span');
    titleEl.textContent = tab.name;
    titleEl.title = tab.name;
    
    // Make tab name editable inline on double click
    titleEl.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      titleEl.contentEditable = true;
      titleEl.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    titleEl.addEventListener('blur', () => {
      if (titleEl.contentEditable === 'true') {
        titleEl.contentEditable = false;
        const newName = titleEl.textContent.trim() || 'Catatan';
        titleEl.textContent = newName;
        tab.name = newName;
        saveScratchpadState();
        // Just update visually without re-rendering to avoid focus issues
      }
    });

    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });
    
    // Prevent single clicks on title from switching tab IF we are editing
    titleEl.addEventListener('click', (e) => {
      if (titleEl.contentEditable === 'true') {
        e.stopPropagation();
      }
    });

    tabEl.appendChild(titleEl);
    
    // Close button (only if more than 1 tab)
    if (scratchpadTabs.length > 1) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'scratchpad-tab-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Tutup Tab';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeScratchpadTab(tab.id);
      };
      tabEl.appendChild(closeBtn);
    }
    
    tabEl.onclick = () => {
      switchScratchpadTab(tab.id);
    };
    
    scratchpadTabsContainer.appendChild(tabEl);
  });
}

function switchScratchpadTab(tabId) {
  if (tabId === activeScratchpadTabId) return; // Prevent re-render on same tab to allow dblclick

  // Save current textarea content to active tab
  const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
  if (currentTab) {
    currentTab.content = spTextarea.value;
  }
  
  activeScratchpadTabId = tabId;
  const newTab = scratchpadTabs.find(t => t.id === tabId);
  if (newTab) {
    spTextarea.value = newTab.content;
  }
  saveScratchpadState();
  renderScratchpadTabs();
}

function addScratchpadTab(name, content) {
  const newId = 'tab-' + Date.now();
  scratchpadTabs.push({
    id: newId,
    name: name || ('Catatan ' + (scratchpadTabs.length + 1)),
    content: content || ''
  });
  switchScratchpadTab(newId);
  saveScratchpadState();
  // Scroll to rightmost
  setTimeout(() => {
    scratchpadTabsContainer.scrollLeft = scratchpadTabsContainer.scrollWidth;
  }, 10);
}

function closeScratchpadTab(tabId) {
  if (scratchpadTabs.length <= 1) return;
  
  const index = scratchpadTabs.findIndex(t => t.id === tabId);
  scratchpadTabs.splice(index, 1);
  
  if (activeScratchpadTabId === tabId) {
    // Switch to adjacent tab
    const nextTab = scratchpadTabs[Math.min(index, scratchpadTabs.length - 1)];
    switchScratchpadTab(nextTab.id);
  } else {
    saveScratchpadState();
    renderScratchpadTabs();
  }
}

// Update current tab content on input
spTextarea.addEventListener('input', () => {
  const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
  if (currentTab) {
    currentTab.content = spTextarea.value;
    saveScratchpadState();
  }
});

// Add tab button
btnAddTab.addEventListener('click', (e) => {
  e.stopPropagation();
  addScratchpadTab();
});

// Toggle scratchpad
btnScratchpad.addEventListener('click', () => {
  if (scratchpadWindow.style.display === 'none') {
    scratchpadWindow.style.display = 'flex';
    // Posisikan di tengah jika baru pertama kali dibuka, atau tetap di tempat asalnya
    renderScratchpadTabs();
    const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
    if (currentTab) {
      spTextarea.value = currentTab.content;
    }
  } else {
    scratchpadWindow.style.display = 'none';
  }
});

// Close scratchpad (hide)
btnScratchpadClose.addEventListener('click', () => {
  scratchpadWindow.style.display = 'none';
});

// Dragging logic
scratchpadHeader.addEventListener('mousedown', (e) => {
  // Prevent dragging if clicked on interactive elements
  if (e.target.closest('#btn-scratchpad-close') || 
      e.target.closest('#btn-add-tab') || 
      e.target.closest('.scratchpad-tab')) return;
  
  isScratchpadDragging = true;
  const rect = scratchpadWindow.getBoundingClientRect();
  spDragOffsetX = e.clientX - rect.left;
  spDragOffsetY = e.clientY - rect.top;
  
  if (window.getComputedStyle(scratchpadWindow).position !== 'absolute') {
    scratchpadWindow.style.position = 'absolute';
    scratchpadWindow.style.bottom = 'auto';
    scratchpadWindow.style.right = 'auto';
  }
  
  scratchpadWindow.style.left = `${e.clientX - spDragOffsetX}px`;
  scratchpadWindow.style.top = `${e.clientY - spDragOffsetY}px`;
});

window.addEventListener('mousemove', (e) => {
  if (!isScratchpadDragging) return;
  e.preventDefault(); 
  
  let newLeft = e.clientX - spDragOffsetX;
  let newTop = e.clientY - spDragOffsetY;
  
  const maxX = window.innerWidth - scratchpadWindow.offsetWidth;
  const maxY = window.innerHeight - scratchpadWindow.offsetHeight;
  
  if (newLeft < 0) newLeft = 0;
  if (newTop < 0) newTop = 0;
  if (newLeft > maxX) newLeft = maxX;
  if (newTop > maxY) newTop = maxY;
  
  scratchpadWindow.style.left = `${newLeft}px`;
  scratchpadWindow.style.top = `${newTop}px`;
});

window.addEventListener('mouseup', () => {
  isScratchpadDragging = false;
});

// Load IPC (Loads into a new tab)
btnSpLoad.addEventListener('click', async () => {
  try {
    const res = await window.electronAPI.loadScratchpadFile();
    if (res && res.content !== null && res.content !== undefined) {
      const fileName = res.fileName || ('File ' + (scratchpadTabs.length + 1));
      addScratchpadTab(fileName, res.content);
      showToast('Data berhasil dimuat di tab baru', 'success');
    }
  } catch (err) {
    showToast('Gagal memuat file: ' + err.message, 'error');
  }
});

// Save IPC (Saves active tab content)
btnSpSave.addEventListener('click', async () => {
  const content = spTextarea.value;
  if (!content.trim()) {
    showToast('Catatan masih kosong', 'error');
    return;
  }
  try {
    const res = await window.electronAPI.saveScratchpadFile(content);
    if (res && res.success) {
      const currentTab = scratchpadTabs.find(t => t.id === activeScratchpadTabId);
      if (currentTab && res.fileName) {
        currentTab.name = res.fileName;
        saveScratchpadState();
        renderScratchpadTabs();
      }
      showToast('Data berhasil disimpan', 'success');
    }
  } catch (err) {
    showToast('Gagal menyimpan file: ' + err.message, 'error');
  }
});

// ── Start App ─────────────────────────────────────────────────────────────────
init();
