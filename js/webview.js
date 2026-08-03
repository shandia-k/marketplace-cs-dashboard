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

    // Cari kandidat: webview aktif yang BUKAN tab aktif saat ini & bukan whitelist
    const activeTabId = activeStoreId ? activeTabMap[activeStoreId] : null;

    const candidates = [];
    for (const [tabId, entry] of Object.entries(webviewMap)) {
      if (entry.hibernated || !entry.webview) continue;
      if (tabId === activeTabId) continue;
      // Skip toko yang di-whitelist dari hibernasi
      const storeId = Object.keys(storeTabs).find(sid =>
        storeTabs[sid].some(t => t.id === tabId)
      );
      const store = stores.find(s => s.id === storeId);
      if (store?.hibernationWhitelisted) continue;
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

// ── Hibernasi Semua (Manual) ─────────────────────────────────────────────────
function hibernateAll() {
  const activeTabId = activeStoreId ? activeTabMap[activeStoreId] : null;
  let count = 0;
  let skipped = 0;

  for (const [tabId, entry] of Object.entries(webviewMap)) {
    if (entry.hibernated || !entry.webview) continue;
    if (tabId === activeTabId) continue; // Jangan hibernate tab yang sedang aktif

    const storeId = Object.keys(storeTabs).find(sid =>
      storeTabs[sid].some(t => t.id === tabId)
    );
    const store = stores.find(s => s.id === storeId);

    if (store?.hibernationWhitelisted) {
      skipped++;
      continue;
    }

    hibernateTab(storeId, tabId);
    count++;
  }

  if (count === 0 && skipped === 0) {
    showToast('Tidak ada tab yang perlu dihibernasi.', '');
  } else if (count === 0 && skipped > 0) {
    showToast(`Semua tab dilindungi whitelist (${skipped} toko).`, '');
  } else {
    const msg = skipped > 0
      ? `${count} tab dihibernasi. ${skipped} toko dilindungi whitelist.`
      : `${count} tab berhasil dihibernasi.`;
    showToast(msg, 'success');
  }
}

// Expose untuk onclick inline
window.hibernateAll = hibernateAll;

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

  // -- IPC: Ctrl+Click, Zoom, Nav, Unread dari webview-preload.js
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

    } else if (event.channel === 'unread-count') {
      const count = event.args[0] || 0;
      // Akumulasi unread dari semua tab toko ini
      const allTabs = storeTabs[store.id] || [];
      let total = 0;
      allTabs.forEach(t => {
        if (t.id === tab.id) total += count;
        else total += (webviewMap[t.id]?.unreadCount || 0);
      });
      if (webviewMap[tab.id]) webviewMap[tab.id].unreadCount = count;
      unreadMap[store.id] = total;
      renderSidebar(getFilteredStores());
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
        <button onclick="document.querySelector('webview[partition=\\'${store.partition}\\']').reload()" 
          style="margin-top:8px;padding:8px 16px;background:#DF1683;border:none;border-radius:8px;color:white;cursor:pointer;font-size:13px;font-family:'Nexa', sans-serif;">
          Muat Ulang
        </button>`;
    }
  });

  webviewCont.appendChild(wv);
  webviewMap[tab.id] = { webview: wv, loading: loadingEl };
}
