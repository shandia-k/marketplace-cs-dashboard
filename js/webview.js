function hibernateTab(storeId, tabId, forceHard = false) {
  const wvEntry = webviewMap[tabId];
  if (!wvEntry || wvEntry.hibernated || !wvEntry.webview) return;

  // Jangan hibernasi tab yang sedang aktif menyinkronkan riwayat chat
  if (wvEntry.isSyncing) return;

  // Cek apakah RAM sudah melewati batas kritis (> 2GB)
  const isEmergencyRam = typeof ramUsageMB === 'number' && ramUsageMB > (typeof RAM_THRESHOLD_MB !== 'undefined' ? RAM_THRESHOLD_MB : 2048);

  if (!forceHard && !isEmergencyRam) {
    // 🍃 Smart Sleep (Suspended Rendering): Sembunyikan webview (0% GPU & CPU), tetapi PERTAHANKAN WebSocket agar notifikasi email & WhatsApp tetap masuk INSTAN (1 detik)!
    wvEntry.webview.style.display = 'none';
    wvEntry.webview.classList.remove('visible');
    if (wvEntry.loading) wvEntry.loading.style.display = 'none';
  } else {
    // Hard hibernate: Hapus dari DOM hanya saat kondisi RAM darurat (> 2GB)
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

    if (ramUsageMB < RAM_THRESHOLD_MB) return;

    // Cari kandidat: webview aktif yang BUKAN tab aktif saat ini & bukan whitelist & tidak sedang sync
    const activeTabId = activeStoreId ? activeTabMap[activeStoreId] : null;

    const candidates = [];
    for (const [tabId, entry] of Object.entries(webviewMap)) {
      if (entry.hibernated || !entry.webview || entry.isSyncing) continue;
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

    if (entry.isSyncing) {
      skipped++;
      continue;
    }

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
    showToast(`Semua tab dilindungi (${skipped} tab aktif / sinkronisasi).`, '');
  } else {
    const msg = skipped > 0
      ? `${count} tab dihibernasi. ${skipped} tab dilindungi.`
      : `${count} tab berhasil dihibernasi.`;
    showToast(msg, 'success');
  }

  if (window.AppTelemetry) {
    window.AppTelemetry.track('tab_hibernate_all_triggered');
  }
}

// Expose untuk onclick inline
window.hibernateAll = hibernateAll;

// ── Universal Top-Level Navigation URL Validator ─────────────────────────────
// Memastikan hanya URL dokumen halaman utama yang valid (bukan sub-widget/iframe/ephemeral RPC) yang dicatat
function isValidTopNavigationUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean || clean === 'about:blank') return false;

  // Harus diawali dengan protokol http atau https
  if (!/^https?:\/\//i.test(clean)) return false;

  // Filter universal untuk sub-widget, iframe popup, auth frames, captcha, traffic error, dan RPC endpoints
  const invalidSubFrameSignatures = [
    '/widget/hovercard',
    'contacts.google.com/widget',
    'accounts.google.com/o/oauth2/iframe',
    'ogs.google.com',
    'hangouts.google.com/webchat/frame',
    '/embed/',
    'security.shopee.co.id/captcha',
    'verify/traffic/error',
    'shopee.co.id/verify',
    'captcha.tiktok.com'
  ];

  const lower = clean.toLowerCase();
  for (const sig of invalidSubFrameSignatures) {
    if (lower.includes(sig)) return false;
  }

  return true;
}
window.isValidTopNavigationUrl = isValidTopNavigationUrl;

// ── Create Webview ────────────────────────────────────────────────────────────
function createWebview(store, tab) {
  // Build absolute path to webview-preload.js (works dev & packaged)
  const preloadPath = appPath.replace(/\\/g, '/');
  const preloadUrl  = `file:///${preloadPath}/webview-preload.js`;

  // Auto-Healing URL: Pastikan tab.url adalah URL halaman utama yang sah dan bukan URL traffic error / 404
  const cfg = (typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[store.marketplace] : null) || MARKETPLACE_CONFIG.custom;
  const defaultFallbackUrl = store.url || cfg.url || 'https://seller.shopee.co.id/';

  if (store.marketplace === 'shopee') {
    if (tab.url === 'https://seller.shopee.co.id/portal/chat' || tab.url === 'https://seller.shopee.co.id/portal/chat/' || tab.url === 'https://shopee.co.id' || tab.url === 'https://shopee.co.id/') {
      tab.url = defaultFallbackUrl;
    }
    if (tab.initialUrl === 'https://seller.shopee.co.id/portal/chat' || tab.initialUrl === 'https://seller.shopee.co.id/portal/chat/' || tab.initialUrl === 'https://shopee.co.id' || tab.initialUrl === 'https://shopee.co.id/') {
      tab.initialUrl = defaultFallbackUrl;
    }
  }

  if (!isValidTopNavigationUrl(tab.url)) {
    tab.url = defaultFallbackUrl;
  }
  if (!tab.initialUrl || !isValidTopNavigationUrl(tab.initialUrl)) {
    tab.initialUrl = defaultFallbackUrl;
  }

  // Loading overlay
  const loadingEl = document.createElement('div');
  loadingEl.className = 'webview-loading';
  loadingEl.innerHTML = `
    <div class="spinner"></div>
    <p>Membuka ${escapeHtml(store.name)}…</p>`;
  webviewCont.appendChild(loadingEl);

  // Webview element — semua tab dalam 1 toko berbagi partition (1 sesi login) per user
  const actualPartition = getStorePartition(store);
  const isGoogleStore = store.marketplace === 'gmail' || (tab.url && (tab.url.includes('google.com') || tab.url.includes('gmail.com')));
  const cleanUa = isGoogleStore
    ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  const wv = document.createElement('webview');
  wv.className = 'store-webview visible';
  wv.setAttribute('src', tab.url);
  wv.setAttribute('partition', actualPartition);
  wv.setAttribute('preload', preloadUrl);
  wv.setAttribute('useragent', cleanUa);
  wv.setAttribute('allowpopups', '');

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
      if (typeof debouncedSaveStoreTabsState === 'function') debouncedSaveStoreTabsState();

    } else if (event.channel === 'zoom-reset') {
      if (!tabEntry) return;
      tabEntry.zoom = 1.0;
      wv.setZoomFactor(1.0);
      showZoomIndicator(100);
      if (typeof debouncedSaveStoreTabsState === 'function') debouncedSaveStoreTabsState();

    } else if (event.channel === 'nav-back') {
      if (wv.canGoBack()) wv.goBack();

    } else if (event.channel === 'nav-forward') {
      if (wv.canGoForward()) wv.goForward();

    } else if (event.channel === 'nav-refresh') {
      wv.reload();

    } else if (event.channel === 'draft-status') {
      if (webviewMap[tab.id]) webviewMap[tab.id].hasDraft = event.args[0];

    } else if (event.channel === 'unread-count') {
      handleUnreadCount(event.args[0] || 0);

    } else if (event.channel === 'open-quick-reply') {
      if (typeof openQuickReplyDrawer === 'function') {
        openQuickReplyDrawer();
      }

    } else if (event.channel === 'switch-store-index') {
      const idx = (event.args[0] || 1) - 1;
      const ordered = typeof getOrderedStores === 'function' ? getOrderedStores() : stores;
      if (ordered && ordered[idx]) {
        activateStore(ordered[idx].id);
      }

    } else if (event.channel === 'switch-store-relative') {
      const delta = event.args[0] || 1;
      const ordered = typeof getOrderedStores === 'function' ? getOrderedStores() : stores;
      if (ordered && ordered.length > 0) {
        const curIdx = ordered.findIndex(s => s.id === activeStoreId);
        let nextIdx = curIdx + delta;
        if (nextIdx < 0) nextIdx = ordered.length - 1;
        if (nextIdx >= ordered.length) nextIdx = 0;
        activateStore(ordered[nextIdx].id);
      }

    } else if (event.channel === 'clipboard-copied') {
      if (typeof setCapturedClipboard === 'function' && event.args[0]) {
        setCapturedClipboard(event.args[0]);
      }

    } else if (event.channel === 'quick-reply-used' || event.channel === 'template-used') {
      if (window.AppTelemetry) {
        window.AppTelemetry.track('quick_reply_used');
      }

    } else if (event.channel === 'inline-popup-opened') {
      document.body.classList.add('has-quickreply-open');

    } else if (event.channel === 'inline-popup-closed') {
      document.body.classList.remove('has-quickreply-open');

    } else if (event.channel === 'request-quickreply-data') {
      const theme = typeof currentTheme !== 'undefined' ? currentTheme : (document.documentElement.getAttribute('data-theme') || 'dark');
      const clip = typeof currentClipboardValue !== 'undefined' && currentClipboardValue ? currentClipboardValue : (localStorage.getItem('globalCapturedClipboard') || '');
      const hist = typeof clipboardHistory !== 'undefined' ? clipboardHistory : [];
      const csName = window.currentUserProfile?.displayName || window.currentUserName || window.currentUser || 'CS';
      wv.send('sync-smart-templates', {
        templates: typeof smartTemplates !== 'undefined' ? smartTemplates : [],
        storeName: store.name || '',
        csName: csName,
        clipboard: clip,
        history: hist,
        theme: theme
      });

    } else if (event.channel === 'sync-status') {
      const data = event.args[0] || {};
      const entry = webviewMap[tab.id];
      if (!entry) return;

      const wasSyncing = entry.isSyncing;
      const prevProgress = entry.syncProgress;
      entry.isSyncing = !!data.isSyncing;
      entry.syncProgress = data.progress;

      // Munculkan popup edukasi saat pertama kali sinkronisasi terdeteksi
      if (data.isSyncing && !wasSyncing && data.type === 'whatsapp') {
        if (typeof showWaSyncEduModalIfNeeded === 'function') {
          showWaSyncEduModalIfNeeded();
        }
      }

      if (data.completed && wasSyncing) {
        showToast(`✅ ${store.name} selesai disinkronkan & siap digunakan!`, 'success');
      }

      // Render ulang HANYA jika status sinkronisasi atau progres berubah
      if (wasSyncing !== entry.isSyncing || prevProgress !== entry.syncProgress || data.completed) {
        if (activeStoreId === store.id && typeof renderTabBar === 'function') {
          renderTabBar();
        }
        if (typeof renderSidebar === 'function') {
          renderSidebar(getFilteredStores());
        }
      }
    }
  });

  // Helper terpusat untuk akumulasi unread badge & notifikasi suara/toast
  function handleUnreadCount(count) {
    if (typeof count !== 'number' || isNaN(count)) count = 0;
    const allTabs = storeTabs[store.id] || [];
    let total = 0;
    allTabs.forEach(t => {
      if (t.id === tab.id) total += count;
      else total += (webviewMap[t.id]?.unreadCount || 0);
    });
    if (webviewMap[tab.id]) webviewMap[tab.id].unreadCount = count;

    const prevTotal = unreadMap[store.id] || 0;
    unreadMap[store.id] = total;

    // Pemicu Notifikasi Audio & Taskbar Flash jika ada pesan baru bertambah
    if (total > prevTotal && total > 0) {
      if (typeof playNotificationSound === 'function') {
        playNotificationSound();
      }
      if (window.electronAPI && typeof window.electronAPI.flashWindow === 'function') {
        window.electronAPI.flashWindow(true);
      }
      showToast(`💬 Pesan baru di ${store.name} (${total} belum dibaca)`, 'warning');
    }

    renderSidebar(getFilteredStores());
    if (activeStoreId === store.id && typeof renderTabBar === 'function') {
      renderTabBar();
    }
  }

  // ── new-window: target=_blank / window.open() → buka sebagai tab baru di dalam dashboard toko ────
  wv.addEventListener('new-window', (e) => {
    // Selalu cegah Electron membuka jendela popup OS liar
    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    // Abaikan pembukaan window liar dari skrip background/hovercard tanpa klik nyata pengguna
    if (e.isUserGesture === false && e.disposition !== 'new-window' && e.disposition !== 'foreground-tab' && e.disposition !== 'background-tab') {
      return;
    }
    if (e.url && e.url !== 'about:blank' && isValidTopNavigationUrl(e.url)) {
      openUrlInNewTab(store, e.url);
    }
  });

  // ── Auto-update tab title dari halaman & hitung unread count langsung ────
  wv.addEventListener('page-title-updated', e => {
    const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);
    if (tabEntry && e.title) {
      tabEntry.title = e.title.length > 30 ? e.title.substring(0, 28) + '…' : e.title;
      if (activeStoreId === store.id) renderTabBar();
      if (typeof debouncedSaveStoreTabsState === 'function') debouncedSaveStoreTabsState();

      // Jika judul memuat format angka (misal: "(1) WhatsApp", "Inbox (2)"), sinkronkan unread
      const countFromTitle = parseUnreadFromTitle(e.title);
      if (countFromTitle > 0) {
        handleUnreadCount(countFromTitle);
      }
    }
  });

  // ── Loading done & Nav state update ──────────────────────────────────────
  const captureWcId = () => {
    try {
      if (webviewMap[tab.id] && typeof wv.getWebContentsId === 'function') {
        webviewMap[tab.id].wcId = wv.getWebContentsId();
        webviewMap[tab.id].storeId = store.id;
        webviewMap[tab.id].tabId = tab.id;
      }
    } catch (e) {}
  };
  wv.addEventListener('did-attach', captureWcId);
  wv.addEventListener('dom-ready', captureWcId);
  wv.addEventListener('did-finish-load', () => {
    captureWcId();
    loadingEl.classList.add('hidden');
    const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);
    if (tabEntry?.zoom && tabEntry.zoom !== 1.0) {
      wv.setZoomFactor(tabEntry.zoom);
    }
    // Update back/forward button states & Address Bar
    if (activeStoreId === store.id && activeTabMap[store.id] === tab.id) {
      updateNavButtonStates();
      if (typeof updateAddressBarUrl === 'function' && typeof wv.getURL === 'function') {
        try { updateAddressBarUrl(wv.getURL()); } catch (err) {}
      }
    }

    // Sync templates, theme, clipboard, dan history ke webview
    const theme = typeof currentTheme !== 'undefined' ? currentTheme : (document.documentElement.getAttribute('data-theme') || 'dark');
    const clip = typeof currentClipboardValue !== 'undefined' && currentClipboardValue ? currentClipboardValue : (localStorage.getItem('globalCapturedClipboard') || '');
    const hist = typeof clipboardHistory !== 'undefined' ? clipboardHistory : [];
    wv.send('sync-smart-templates', {
      templates: typeof smartTemplates !== 'undefined' ? smartTemplates : [],
      storeName: store.name || '',
      clipboard: clip,
      history: hist,
      theme: theme
    });
  });

  // Update nav state & sinkronisasi tab.url saat navigasi dalam halaman (Chromium Main-Frame Isolation)
  const handleNavChange = (e) => {
    // Lapisan 1 (Frame Boundary Isolation): Abaikan jika navigasi berasal dari sub-frame/iframe/widget
    if (e && e.isMainFrame === false) {
      return;
    }

    let currentUrl = e?.url;
    if (!currentUrl && typeof wv.getURL === 'function') {
      try { currentUrl = wv.getURL(); } catch (err) {}
    }

    if (isValidTopNavigationUrl(currentUrl)) {
      const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);
      if (tabEntry) {
        tabEntry.url = currentUrl;
        if (!tabEntry.initialUrl) {
          tabEntry.initialUrl = store.url || currentUrl;
        }
      }
      if (activeStoreId === store.id && activeTabMap[store.id] === tab.id) {
        updateNavButtonStates();
        if (typeof updateAddressBarUrl === 'function') {
          updateAddressBarUrl(currentUrl);
        }
      }
      if (typeof debouncedSaveStoreTabsState === 'function') {
        debouncedSaveStoreTabsState();
      }
    }
  };

  wv.addEventListener('did-navigate', handleNavChange);
  wv.addEventListener('did-navigate-in-page', handleNavChange);

  wv.addEventListener('did-fail-load', e => {
    if (e.errorCode !== -3) {
      loadingEl.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <p style="color:#fca5a5">Gagal memuat halaman.<br>
        <small style="color:#64748b">${escapeHtml(e.errorDescription || 'Periksa koneksi internet.')}</small></p>
        <button onclick="if(typeof retryTab===\\'function\\'){retryTab(\\'${escapeHtml(store.id)}\\', \\'${escapeHtml(tab.id)}\\');}else{this.closest(\\'webview\\')?.reload();}" 
          style="margin-top:8px;padding:8px 16px;background:var(--accent-primary, #DF1683);border:none;border-radius:8px;color:white;cursor:pointer;font-size:13px;font-family:'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;font-weight:500;">
          Muat Ulang
        </button>`;
    }
  });

  // ── Webview Self-Healing & Crash Guard ──────────────────────────────────────
  let isRebuilding = false;
  const triggerSelfHealing = (reason) => {
    if (isRebuilding) return;
    isRebuilding = true;

    console.warn(`[Webview Crash Guard] Triggering self-healing for "${store.name}" (${tab.id}). Reason: ${reason}`);
    if (webviewMap[tab.id]) {
      webviewMap[tab.id].isCrashed = true;
    }

    if (window.AppTelemetry) {
      window.AppTelemetry.track('webview_crashed_recovered');
    }

    // Tampilkan visual pemulihan
    loadingEl.innerHTML = `
      <div class="spinner"></div>
      <p style="color:var(--text-primary); font-weight:600;">⚡ Memulihkan sesi ${escapeHtml(store.name)}...</p>
      <small style="color:var(--text-muted); font-size:11px;">Alokasi memori disegarkan dari background</small>
    `;
    loadingEl.classList.remove('hidden');
    loadingEl.style.display = '';

    setTimeout(() => {
      try {
        if (wv.parentNode) wv.parentNode.removeChild(wv);
      } catch (e) {}
      try {
        if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
      } catch (e) {}

      delete webviewMap[tab.id];

      // Rekonstruksi bersih
      createWebview(store, tab);

      // Jika tab ini adalah tab yang aktif, pastikan visible & update tampilan
      if (activeStoreId === store.id && activeTabMap[store.id] === tab.id) {
        if (webviewMap[tab.id]?.webview) {
          webviewMap[tab.id].webview.classList.add('visible');
          webviewMap[tab.id].webview.style.display = '';
        }
        showToast(`⚡ Sesi ${store.name} berhasil dipulihkan otomatis!`, 'success');
        if (typeof renderTabBar === 'function') renderTabBar();
      }
    }, 200);
  };

  wv.addEventListener('render-process-gone', (e) => {
    console.warn(`[Webview Crash Event] render-process-gone on tab ${tab.id}:`, e.details);
    triggerSelfHealing(e.details?.reason || 'render-process-gone');
  });

  wv.addEventListener('crashed', () => {
    console.warn(`[Webview Crash Event] crashed on tab ${tab.id}`);
    triggerSelfHealing('crashed');
  });

  wv.addEventListener('gpu-process-crashed', () => {
    console.warn(`[Webview Crash Event] gpu-process-crashed on tab ${tab.id}`);
    triggerSelfHealing('gpu-process-crashed');
  });

  wv.addEventListener('plugin-crashed', (e) => {
    console.warn(`[Webview Crash Event] plugin-crashed on tab ${tab.id}:`, e.name);
  });

  wv.addEventListener('unresponsive', () => {
    console.warn(`[Webview Watchdog] Webview for ${store.name} is temporarily unresponsive.`);
  });

  webviewCont.appendChild(wv);
  webviewMap[tab.id] = { webview: wv, loading: loadingEl, isCrashed: false, storeId: store.id, tabId: tab.id };
}

// ── Hard Recreate Active Tab Webview (Emergency Heal Utility) ────────────────
function forceRecreateActiveTab() {
  if (!activeStoreId) return;
  const curTabId = activeTabMap[activeStoreId];
  const store = stores.find(s => s.id === activeStoreId);
  const tab = storeTabs[activeStoreId]?.find(t => t.id === curTabId);
  if (!store || !tab) return;

  const entry = webviewMap[curTabId];
  if (entry) {
    try { entry.webview?.remove(); } catch (e) {}
    try { entry.loading?.remove(); } catch (e) {}
    delete webviewMap[curTabId];
  }

  createWebview(store, tab);
  if (webviewMap[curTabId]?.webview) {
    webviewMap[curTabId].webview.classList.add('visible');
    webviewMap[curTabId].webview.style.display = '';
  }
  showToast(`⚡ Halaman ${store.name} disegarkan & dipulihkan total!`, 'success');
  if (typeof renderTabBar === 'function') renderTabBar();
}
window.forceRecreateActiveTab = forceRecreateActiveTab;

// ── Smart Title Parser ────────────────────────────────────────────────────────
function parseUnreadFromTitle(title) {
  if (!title || typeof title !== 'string') return 0;
  let m = title.match(/\((\d+)\+?\)/);
  if (m) return parseInt(m[1], 10);
  m = title.match(/\[(\d+)\+?\]/);
  if (m) return parseInt(m[1], 10);
  m = title.match(/(\d+)\+?\s*(?:pesan|message|msg|chat|unread|email|surat)/i);
  if (m) return parseInt(m[1], 10);
  return 0;
}
window.parseUnreadFromTitle = parseUnreadFromTitle;

// ── Smart Staggered Background Ping ──────────────────────────────────────────
let pingQueue = [];
let isPingRunning = false;
let pingInterval = null;

function runNextBackgroundPing() {
  if (isPingRunning) return;

  // Proteksi RAM Guard: Jangan jalankan background ping jika pemakaian RAM mendekati batas
  if (typeof ramUsageMB === 'number' && ramUsageMB > 1200) {
    return;
  }

  // Kumpulkan tab yang saat ini sedang di-hard hibernate
  if (pingQueue.length === 0) {
    const hibernatedTabs = [];
    Object.entries(storeTabs).forEach(([storeId, tabs]) => {
      tabs.forEach(tab => {
        const entry = webviewMap[tab.id];
        if (entry && entry.hibernated && !entry.webview) {
          hibernatedTabs.push({ storeId, tab });
        }
      });
    });
    pingQueue = hibernatedTabs;
  }

  if (pingQueue.length === 0) return;

  const item = pingQueue.shift();
  const { storeId, tab } = item;
  const store = stores.find(s => s.id === storeId);
  if (!store) return;

  isPingRunning = true;

  // Buat webview ping tersembunyi
  const preloadPath = appPath.replace(/\\/g, '/');
  const preloadUrl  = `file:///${preloadPath}/webview-preload.js`;
  const actualPartition = getStorePartition(store);

  const pingWv = document.createElement('webview');
  pingWv.className = 'store-webview-ping';
  pingWv.style.cssText = 'position:fixed; left:-9999px; top:-9999px; width:400px; height:400px; opacity:0; pointer-events:none; visibility:hidden;';
  pingWv.setAttribute('src', tab.url);
  pingWv.setAttribute('partition', actualPartition);
  pingWv.setAttribute('preload', preloadUrl);
  const isGoogleStore = store.marketplace === 'gmail' || (tab.url && (tab.url.includes('google.com') || tab.url.includes('gmail.com')));
  const pingUa = isGoogleStore
    ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  pingWv.setAttribute('useragent', pingUa);

  let unreadDetected = 0;
  let hasCleanedUp = false;
  let pingTimeout = null;

  const cleanupPing = (keepAlive = false) => {
    if (hasCleanedUp) return;
    hasCleanedUp = true;
    isPingRunning = false;
    if (pingTimeout) {
      clearTimeout(pingTimeout);
      pingTimeout = null;
    }

    // Jika tab sudah dibuka/diaktifkan secara manual oleh user saat ping berjalan
    const currentEntry = webviewMap[tab.id];
    if (currentEntry && currentEntry.webview && !currentEntry.hibernated) {
      if (unreadDetected > 0) {
        currentEntry.unreadCount = unreadDetected;
        unreadMap[store.id] = unreadDetected;
        if (typeof playNotificationSound === 'function') playNotificationSound();
        if (window.electronAPI?.flashWindow) window.electronAPI.flashWindow(true);
        showToast(`💬 Pesan baru masuk di ${store.name}! (${unreadDetected} pesan)`, 'warning');
        renderSidebar(getFilteredStores());
        if (activeStoreId === store.id) renderTabBar();
      }
      try { pingWv.remove(); } catch (e) {}
      return;
    }

    if (keepAlive) {
      // Ada chat/email masuk! Pindahkan webview ke dalam webviewCont dan jadikan webview resmi
      pingWv.className = 'store-webview';
      pingWv.style.cssText = '';
      if (activeStoreId === store.id && activeTabMap[store.id] === tab.id) {
        pingWv.classList.add('visible');
      }

      // Pastikan webview dipindahkan dari document.body ke webviewCont
      webviewCont.appendChild(pingWv);

      const loadingEl = document.createElement('div');
      loadingEl.className = 'webview-loading hidden';
      webviewCont.appendChild(loadingEl);

      webviewMap[tab.id] = {
        webview: pingWv,
        loading: loadingEl,
        hibernated: false,
        unreadCount: unreadDetected
      };

      const prevTotal = unreadMap[store.id] || 0;
      unreadMap[store.id] = unreadDetected;

      if (unreadDetected > prevTotal && unreadDetected > 0) {
        if (typeof playNotificationSound === 'function') playNotificationSound();
        if (window.electronAPI?.flashWindow) window.electronAPI.flashWindow(true);
        showToast(`💬 Pesan baru masuk di ${store.name}! (${unreadDetected} pesan)`, 'warning');
      }

      renderSidebar(getFilteredStores());
      if (activeStoreId === store.id) renderTabBar();
    } else {
      // Tidak ada chat baru, hancurkan webview ping agar RAM tetap bersih
      try {
        pingWv.remove();
      } catch (e) {}
    }
  };

  // 1. Tangkap update unread lewat IPC dari preload
  pingWv.addEventListener('ipc-message', (e) => {
    if (e.channel === 'unread-count') {
      const count = e.args[0] || 0;
      if (count > 0) {
        unreadDetected = count;
        cleanupPing(true); // Keep alive karena ada chat/email baru
      }
    }
  });

  // 2. Tangkap update title langsung dari webview (Gmail/Outlook/WA selalu update title)
  pingWv.addEventListener('page-title-updated', (e) => {
    if (e.title) {
      const count = parseUnreadFromTitle(e.title);
      if (count > 0) {
        unreadDetected = count;
        cleanupPing(true);
      }
    }
  });

  // Timeout maksimal 16 detik per ping
  pingTimeout = setTimeout(() => {
    cleanupPing(false);
  }, 16000);

  pingWv.addEventListener('did-finish-load', () => {
    // Beri waktu 7.5 detik setelah load untuk mendeteksi chat badge/title/DOM pada SPA berat (Gmail/WA/Shopee)
    setTimeout(() => {
      if (unreadDetected === 0) {
        try {
          if (typeof pingWv.getTitle === 'function') {
            const currentTitle = pingWv.getTitle();
            const count = parseUnreadFromTitle(currentTitle);
            if (count > 0) {
              unreadDetected = count;
              cleanupPing(true);
              return;
            }
          }
        } catch (e) {}
        cleanupPing(false);
      }
    }, 7500);
  });

  pingWv.addEventListener('did-fail-load', () => {
    cleanupPing(false);
  });

  document.body.appendChild(pingWv);
}

function cancelPendingPing(tabId) {
  if (!tabId) return;
  pingQueue = pingQueue.filter(item => item.tab && item.tab.id !== tabId);
}

function startStaggeredBackgroundPing() {
  if (pingInterval) clearInterval(pingInterval);
  // Jalankan background ping setiap 45 detik secara bergantian untuk tab tidur
  pingInterval = setInterval(runNextBackgroundPing, 45000);
}

function stopStaggeredBackgroundPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  pingQueue = [];
  isPingRunning = false;
}

// Expose ke global
window.cancelPendingPing            = cancelPendingPing;
window.startStaggeredBackgroundPing = startStaggeredBackgroundPing;
window.stopStaggeredBackgroundPing  = stopStaggeredBackgroundPing;
