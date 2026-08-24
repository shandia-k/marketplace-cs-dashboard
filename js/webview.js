function hibernateTab(storeId, tabId) {
  const wvEntry = webviewMap[tabId];
  if (!wvEntry || wvEntry.hibernated || !wvEntry.webview) return;

  const store = (typeof stores !== 'undefined' && Array.isArray(stores)) ? stores.find(s => s.id === storeId) : null;
  const tab = (typeof storeTabs !== 'undefined' && storeTabs[storeId]) ? storeTabs[storeId].find(t => t.id === tabId) : null;
  const isWhatsApp = store?.marketplace === 'whatsapp' || (store?.url || '').includes('whatsapp.com') || (tab?.url || '').includes('whatsapp.com');

  // Jangan hibernasi tab yang sedang aktif menyinkronkan riwayat chat atau WhatsApp Web (mencegah putus koneksi WebSocket & logout)
  if (wvEntry.isSyncing || isWhatsApp) return;

  // 🍃 Smart Suspended Sleep (0 Detik Wake):
  // Sembunyikan webview (0% GPU & CPU compositing), mute audio, tetapi PERTAHANKAN elemen di DOM
  // agar saat dibuka kembali langsung muncul 0 MILIDETIK (INSTAN) tanpa reload!
  wvEntry.webview.style.display = 'none';
  wvEntry.webview.classList.remove('visible');
  if (wvEntry.loading) wvEntry.loading.style.display = 'none';
  if (typeof wvEntry.webview.setAudioMuted === 'function') {
    try { wvEntry.webview.setAudioMuted(true); } catch (e) { }
  }

  wvEntry.hibernated = true;

  // Update UI
  if (activeStoreId === storeId) renderTabBar();
  renderSidebar(getFilteredStores());
}

async function checkAndHibernateIfNeeded() {
  try {
    if (window.electronAPI && typeof window.electronAPI.getAppMemoryMB === 'function') {
      const mb = await window.electronAPI.getAppMemoryMB();
      if (typeof mb === 'number' && mb > 0) ramUsageMB = mb;
    }

    // 1. Pangkas memori cache in-memory jika RAM mendekati batas (> 2200 MB)
    if (ramUsageMB > 2200 && window.electronAPI?.pruneBackgroundMemory) {
      try {
        await window.electronAPI.pruneBackgroundMemory();
      } catch (e) { }
    }

    const threshold = typeof RAM_THRESHOLD_MB !== 'undefined' ? RAM_THRESHOLD_MB : 2048;
    if (ramUsageMB < threshold) return;

    // 2. Terapkan Smart Sleep untuk tab tidak aktif (LRU) yang bukan tab aktif saat ini
    const activeTabId = activeStoreId ? activeTabMap[activeStoreId] : null;
    const rightActiveTabId = (typeof isSplitViewActive !== 'undefined' && isSplitViewActive && splitRightTabId) ? splitRightTabId : null;

    const candidates = [];
    for (const [tabId, entry] of Object.entries(webviewMap)) {
      if (entry.hibernated || !entry.webview || entry.isSyncing) continue;
      if (tabId === activeTabId || tabId === rightActiveTabId) continue;

      const storeId = Object.keys(storeTabs).find(sid =>
        storeTabs[sid].some(t => t.id === tabId)
      );
      const store = stores.find(s => s.id === storeId);
      
      // Jika di-shield (whitelist), pertahankan rendering aktif kecuali kondisi darurat (> 3GB)
      if (store?.hibernationWhitelisted && ramUsageMB < 3072) continue;

      candidates.push({ tabId, lastSeen: lastAccessed[tabId] || 0 });
    }

    if (candidates.length === 0) return;

    // Smart Sleep yang paling lama tidak diakses (LRU) tanpa merusak DOM
    candidates.sort((a, b) => a.lastSeen - b.lastSeen);
    const oldest = candidates[0];
    const storeId = Object.keys(storeTabs).find(sid =>
      storeTabs[sid].some(t => t.id === oldest.tabId)
    );

    if (storeId) {
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

    // Terapkan Smart Suspended Sleep (0 detik wake)
    hibernateTab(storeId, tabId);
    count++;
  }

  // Trigger pemangkasan memory cache seketika
  if (window.electronAPI?.pruneBackgroundMemory) {
    window.electronAPI.pruneBackgroundMemory().catch(() => {});
  }

  if (count === 0 && skipped === 0) {
    showToast('Semua tab latar belakang sudah dalam mode hemat RAM.', '');
  } else if (count === 0 && skipped > 0) {
    showToast(`Semua tab dilindungi (${skipped} tab terlindungi dari sleep). Memori cache telah dipangkas!`, 'success');
  } else {
    const msg = skipped > 0
      ? `${count} tab masuk Mode Hemat (0 detik wake). ${skipped} tab dilindungi.`
      : `${count} tab masuk Mode Hemat RAM (0 detik wake).`;
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
function createWebview(store, tab, targetPane = 'left') {
  // Build absolute path to webview-preload.js (works dev & packaged)
  const preloadPath = appPath.replace(/\\/g, '/');
  const preloadUrl = `file:///${preloadPath}/webview-preload.js`;

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
  const leftPaneEl = document.getElementById('split-pane-left');
  const rightBodyEl = document.getElementById('split-right-body');
  const parentContainer = (targetPane === 'right' && rightBodyEl) ? rightBodyEl : (leftPaneEl || webviewCont);
  parentContainer.appendChild(loadingEl);

  // Webview element — semua tab dalam 1 toko berbagi partition (1 sesi login) per user
  const actualPartition = getStorePartition(store);
  const isGoogleAuthUrl = tab.url && (tab.url.includes('accounts.google.com') || tab.url.includes('mail.google.com') || tab.url.includes('google.com/accounts'));
  const cleanUa = isGoogleAuthUrl
    ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  const isTabActive = (targetPane === 'right') || (typeof activeStoreId !== 'undefined' && activeStoreId === store.id && activeTabMap[store.id] === tab.id);
  const wv = document.createElement('webview');
  wv.className = isTabActive ? 'store-webview visible' : 'store-webview';
  wv.setAttribute('src', tab.url);
  wv.setAttribute('partition', actualPartition);
  wv.setAttribute('preload', preloadUrl);
  wv.setAttribute('useragent', cleanUa);
  const isWhatsApp = store.marketplace === 'whatsapp' || (store.url || '').toLowerCase().includes('whatsapp.com') || (tab.url || '').toLowerCase().includes('whatsapp.com');
  const bgThrottling = isWhatsApp ? 'false' : 'true';
  wv.setAttribute('webpreferences', `backgroundThrottling=${bgThrottling},sandbox=false`);

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

    } else if (event.channel === 'webview-page-focused') {
      const isRight = (typeof isSplitViewActive !== 'undefined' && isSplitViewActive && splitRightTabId === tab.id);
      if (typeof setFocusedPane === 'function') {
        setFocusedPane(isRight ? 'right' : 'left');
      }

    } else if (event.channel === 'open-quick-reply') {
      const isRight = (typeof isSplitViewActive !== 'undefined' && isSplitViewActive && splitRightTabId === tab.id);
      if (typeof setFocusedPane === 'function') {
        setFocusedPane(isRight ? 'right' : 'left');
      }
      if (typeof openQuickReplyDrawer === 'function') {
        openQuickReplyDrawer();
      }

    } else if (event.channel === 'open-find-in-page') {
      const isRight = (typeof isSplitViewActive !== 'undefined' && isSplitViewActive && splitRightTabId === tab.id);
      if (typeof setFocusedPane === 'function') {
        setFocusedPane(isRight ? 'right' : 'left');
      }
      if (typeof openFindInPage === 'function') {
        openFindInPage(event.args[0]);
      }

    } else if (event.channel === 'close-find-in-page') {
      if (typeof closeFindInPage === 'function') {
        closeFindInPage();
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
    const rawUrl = e.url || '';
    if (!rawUrl || rawUrl === 'about:blank') return;

    const lowerUrl = rawUrl.toLowerCase();
    const isOAuth = lowerUrl.includes('accounts.google.com') ||
      lowerUrl.includes('accounts.youtube.com') ||
      lowerUrl.includes('appleid.apple.com') ||
      lowerUrl.includes('login.live.com') ||
      lowerUrl.includes('login.microsoftonline.com') ||
      lowerUrl.includes('facebook.com/dialog/oauth') ||
      lowerUrl.includes('facebook.com/login') ||
      lowerUrl.includes('github.com/login') ||
      lowerUrl.includes('github.com/sessions') ||
      lowerUrl.includes('gitlab.com/oauth') ||
      lowerUrl.includes('oauth') ||
      lowerUrl.includes('/auth/') ||
      lowerUrl.includes('/authorize') ||
      lowerUrl.includes('/sso/') ||
      lowerUrl.includes('response_type=code') ||
      lowerUrl.includes('client_id=');

    // Jika ini adalah dialog popup autentikasi OAuth / SSO, jangan hijack menjadi tab baru
    // Biarkan setWindowOpenHandler di main process membukanya dengan window.opener & partisi yang sama
    if (isOAuth) {
      return;
    }

    // Selalu cegah Electron membuka jendela popup OS liar untuk link biasa
    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Pastikan URL valid dan buka sebagai tab baru di toko ini
    if (isValidTopNavigationUrl(rawUrl)) {
      openUrlInNewTab(store, rawUrl);
    }
  });

  // ── Auto-update tab title dari halaman & hitung unread count langsung ────
  wv.addEventListener('page-title-updated', e => {
    const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);
    if (tabEntry && e.title) {
      tabEntry.title = e.title.length > 30 ? e.title.substring(0, 28) + '…' : e.title;
      if (activeStoreId === store.id || (typeof isSplitViewActive !== 'undefined' && isSplitViewActive && splitRightStoreId === store.id)) {
        renderTabBar();
      }
      if (typeof debouncedSaveStoreTabsState === 'function') debouncedSaveStoreTabsState();

      // Jika judul memuat format angka (misal: "(1) WhatsApp", "Inbox (2)"), sinkronkan unread
      const countFromTitle = parseUnreadFromTitle(e.title);
      if (countFromTitle > 0) {
        handleUnreadCount(countFromTitle);
      }
    }
  });

  // ── Found In Page (Ctrl+F) Event Listener ────────────────────────────────
  // Hasil pencarian diterima via DOM event 'found-in-page' pada elemen <webview>
  wv.addEventListener('found-in-page', (event) => {
    if (typeof handleFoundInPageResult === 'function') {
      handleFoundInPageResult(tab.id, event.result);
    }
  });

  // ── Loading done & Nav state update ──────────────────────────────────────
  const isThisTabCurrentlyFocused = () => {
    if (typeof isSplitViewActive !== 'undefined' && isSplitViewActive) {
      if (activeFocusedPane === 'right') {
        return splitRightStoreId === store.id && splitRightTabId === tab.id;
      } else {
        return activeStoreId === store.id && activeTabMap[store.id] === tab.id;
      }
    }
    return activeStoreId === store.id && activeTabMap[store.id] === tab.id;
  };

  const injectModernScrollbar = () => {
    try {
      if (typeof wv.insertCSS === 'function') {
        wv.insertCSS(`
          ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
          ::-webkit-scrollbar-track { background: transparent !important; }
          ::-webkit-scrollbar-thumb { background: rgba(145, 145, 165, 0.4) !important; border-radius: 99px !important; border: 1px solid transparent !important; background-clip: content-box !important; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(223, 22, 131, 0.75) !important; }
          ::-webkit-scrollbar-corner { background: transparent !important; }
          * { scrollbar-width: thin !important; scrollbar-color: rgba(145, 145, 165, 0.4) transparent !important; }
        `).catch(() => {});
      }
    } catch (e) {}
  };

  const captureWcId = () => {
    try {
      if (webviewMap[tab.id] && typeof wv.getWebContentsId === 'function') {
        webviewMap[tab.id].wcId = wv.getWebContentsId();
        webviewMap[tab.id].storeId = store.id;
        webviewMap[tab.id].tabId = tab.id;
      }
    } catch (e) { }
  };
  wv.addEventListener('did-attach', captureWcId);
  wv.addEventListener('dom-ready', () => {
    captureWcId();
    injectModernScrollbar();
  });
  wv.addEventListener('did-finish-load', () => {
    captureWcId();
    injectModernScrollbar();
    loadingEl.classList.add('hidden');
    loadingEl.style.display = 'none';
    const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);
    if (tabEntry?.zoom && tabEntry.zoom !== 1.0) {
      wv.setZoomFactor(tabEntry.zoom);
    }
    // Update back/forward button states & Address Bar
    if (isThisTabCurrentlyFocused()) {
      updateNavButtonStates();
      if (typeof updateAddressBarUrl === 'function' && typeof wv.getURL === 'function') {
        try { updateAddressBarUrl(wv.getURL()); } catch (err) { }
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
      try { currentUrl = wv.getURL(); } catch (err) { }
    }

    if (isValidTopNavigationUrl(currentUrl)) {
      const tabEntry = storeTabs[store.id]?.find(t => t.id === tab.id);
      if (tabEntry) {
        tabEntry.url = currentUrl;
        if (!tabEntry.initialUrl) {
          tabEntry.initialUrl = store.url || currentUrl;
        }
      }
      if (isThisTabCurrentlyFocused()) {
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
    if (tab) hideGhostSnapshot(tab.id, true);
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
      } catch (e) { }
      try {
        if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
      } catch (e) { }

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

  wv.addEventListener('focus', () => {
    const isRight = (typeof isSplitViewActive !== 'undefined' && isSplitViewActive && splitRightTabId === tab.id);
    if (typeof setFocusedPane === 'function') {
      setFocusedPane(isRight ? 'right' : 'left');
    }
  });

  parentContainer.appendChild(wv);
  webviewMap[tab.id] = { webview: wv, loading: loadingEl, isCrashed: false, storeId: store.id, tabId: tab.id, pane: targetPane };

  // ⚡ Enforce Hot Webview Pool limit (maksimal 5 webview teraktif di DOM)
  if (typeof manageHotWebviewPool === 'function') {
    manageHotWebviewPool();
  }
}

/**
 * ⚡ Hot Webview Pool Manager (Dual-Layer State Retention)
 * Menjaga tab aktif tetap responsif dan mengalihkan tab lama ke Smart Sleep (display: none, audio muted)
 * tanpa menghancurkan DOM agar dapat didekompresi kernel Windows secara instan (<30ms).
 */
function manageHotWebviewPool() {
  const poolLimit = typeof HOT_WEBVIEW_POOL_LIMIT === 'number' ? HOT_WEBVIEW_POOL_LIMIT : 5;
  const activeTabId = activeStoreId ? activeTabMap[activeStoreId] : null;
  const rightActiveTabId = (typeof isSplitViewActive !== 'undefined' && isSplitViewActive && splitRightTabId) ? splitRightTabId : null;

  // Kumpulkan seluruh webview yang saat ini hidup di DOM
  const liveEntries = [];
  for (const [tabId, entry] of Object.entries(webviewMap)) {
    if (entry && entry.webview && entry.webview.isConnected) {
      liveEntries.push({
        tabId,
        entry,
        isActive: (tabId === activeTabId || tabId === rightActiveTabId),
        lastSeen: lastAccessed[tabId] || 0,
        hasDraft: Boolean(entry.hasDraft),
        isSyncing: Boolean(entry.isSyncing)
      });
    }
  }

  // Jika jumlah webview di DOM masih di bawah batas pool, biarkan semuanya tetap hidup (0s wake)
  if (liveEntries.length <= poolLimit) return;

  // Urutkan berdasarkan waktu terakhir diakses (paling baru di atas)
  liveEntries.sort((a, b) => b.lastSeen - a.lastSeen);

  // Tab yang masuk pool: Tab aktif + (poolLimit - 1) tab teraktif berikutnya
  const warmTabIds = new Set();
  if (activeTabId) warmTabIds.add(activeTabId);
  if (rightActiveTabId) warmTabIds.add(rightActiveTabId);

  for (const item of liveEntries) {
    if (warmTabIds.size >= poolLimit) break;
    warmTabIds.add(item.tabId);
  }

  // 🍃 Dual-Layer State Retention:
  // Alihkan tab di luar warmTabIds ke Smart Sleep tanpa menghancurkan DOM
  for (const item of liveEntries) {
    if (warmTabIds.has(item.tabId)) continue;
    
    // Cari apakah tab ini adalah WhatsApp Web
    const storeId = Object.keys(storeTabs).find(sid => storeTabs[sid].some(t => t.id === item.tabId));
    const store = (typeof stores !== 'undefined' && Array.isArray(stores)) ? stores.find(s => s.id === storeId) : null;
    const tab = (typeof storeTabs !== 'undefined' && storeId && storeTabs[storeId]) ? storeTabs[storeId].find(t => t.id === item.tabId) : null;
    const isWhatsApp = store?.marketplace === 'whatsapp' || (store?.url || '').includes('whatsapp.com') || (tab?.url || '').includes('whatsapp.com');

    // Jangan hibernasi tab yang memiliki draft, sedang sync, atau WhatsApp Web
    if (item.hasDraft || item.isSyncing || isWhatsApp) continue;

    if (!item.entry.hibernated) {
      item.entry.webview.style.display = 'none';
      item.entry.webview.classList.remove('visible');
      if (item.entry.loading) item.entry.loading.style.display = 'none';
      if (typeof item.entry.webview.setAudioMuted === 'function') {
        try { item.entry.webview.setAudioMuted(true); } catch (e) { }
      }
      item.entry.hibernated = true;
    }
  }
}
window.manageHotWebviewPool = manageHotWebviewPool;

// ── Hard Recreate Active Tab Webview (Emergency Heal Utility) ────────────────
function forceRecreateActiveTab() {
  if (!activeStoreId) return;
  const curTabId = activeTabMap[activeStoreId];
  const store = stores.find(s => s.id === activeStoreId);
  const tab = storeTabs[activeStoreId]?.find(t => t.id === curTabId);
  if (!store || !tab) return;

  const entry = webviewMap[curTabId];
  if (entry) {
    try { entry.webview?.remove(); } catch (e) { }
    try { entry.loading?.remove(); } catch (e) { }
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

// ── Show Tab in Right Pane (Side-by-Side View) ───────────────────────────────
function showTabInRightPane(store, tab) {
  const rightBodyEl = document.getElementById('split-right-body');
  if (!rightBodyEl) return;

  // Sembunyikan webview lain yang ada di right body
  rightBodyEl.querySelectorAll('webview.store-webview').forEach(el => {
    el.classList.remove('visible');
    el.style.display = 'none';
  });

  lastAccessed[tab.id] = Date.now();

  let entry = webviewMap[tab.id];

  // Jika webview belum dibuat atau crashed, buat di right pane
  if (!entry || !entry.webview || !entry.webview.isConnected || (typeof entry.webview.isCrashed === 'function' && entry.webview.isCrashed())) {
    if (entry) {
      try { entry.webview?.remove(); } catch (e) {}
      try { entry.loading?.remove(); } catch (e) {}
      delete webviewMap[tab.id];
    }
    createWebview(store, tab, 'right');
  } else {
    // Jika webview sudah ada, pindahkan ke right body jika belum di dalamnya
    if (!rightBodyEl.contains(entry.webview)) {
      rightBodyEl.appendChild(entry.webview);
    }
    entry.webview.style.display = '';
    entry.webview.classList.add('visible');
    if (entry.loading) {
      entry.loading.style.display = 'none';
    }
    if (tab.zoom && tab.zoom !== 1.0) {
      try { entry.webview.setZoomFactor(tab.zoom); } catch (e) {}
    }
  }
}
window.showTabInRightPane = showTabInRightPane;

// ── Render Split Tab Picker (Thumbnail Grid) ─────────────────────────────────
function renderSplitTabPicker() {
  const container = document.getElementById('split-picker-body');
  if (!container) return;

  const searchInput = document.getElementById('split-picker-search-input');
  const query = (searchInput?.value || splitPickerFilter || '').toLowerCase().trim();
  const activeMpFilter = splitPickerMarketplace || 'all';

  const leftActiveTabId = activeStoreId ? activeTabMap[activeStoreId] : null;

  // Filter stores
  const filteredStores = stores.filter(store => {
    if (activeMpFilter !== 'all' && store.marketplace !== activeMpFilter) {
      return false;
    }
    if (!query) return true;
    const matchStoreName = (store.name || '').toLowerCase().includes(query);
    const matchMp = (store.marketplace || '').toLowerCase().includes(query);
    const tabs = storeTabs[store.id] || [];
    const matchTabs = tabs.some(t => (t.title || '').toLowerCase().includes(query) || (t.url || '').toLowerCase().includes(query));
    return matchStoreName || matchMp || matchTabs;
  });

  if (filteredStores.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 28px 16px; text-align: center;">
        <p style="font-size: 13px; color: var(--text-muted);">Tidak ada toko atau tab yang cocok dengan pencarian.</p>
      </div>`;
    return;
  }

  const html = filteredStores.map(store => {
    if (typeof ensureStoreTabs === 'function') {
      ensureStoreTabs(store);
    }
    const tabs = storeTabs[store.id] || [];
    const cfg = (typeof MARKETPLACE_CONFIG !== 'undefined' ? MARKETPLACE_CONFIG[store.marketplace] : null) || MARKETPLACE_CONFIG.custom;
    const initials = (store.initials || store.name.substring(0, 2)).toUpperCase();
    const bgStyle = store.color ? `style="background: ${escapeHtml(store.color)}"` : '';
    const unread = unreadMap[store.id] || 0;

    const tabsHtml = tabs.map(tab => {
      const isCurrentLeft = (store.id === activeStoreId && tab.id === leftActiveTabId);
      const isCurrentRight = (store.id === splitRightStoreId && tab.id === splitRightTabId);

      let domain = '';
      try {
        domain = new URL(tab.url || store.url || cfg.url).hostname;
      } catch (e) {
        domain = tab.url || store.url || '';
      }

      let pillHtml = '';
      if (isCurrentLeft) {
        pillHtml = `<span class="split-tab-card-pill pill-left">◀ Aktif di Kiri</span>`;
      } else if (isCurrentRight) {
        pillHtml = `<span class="split-tab-card-pill pill-ready">▶ Aktif di Kanan</span>`;
      } else {
        pillHtml = `<span class="split-tab-card-pill pill-ready">⚡ Buka di Kanan</span>`;
      }

      return `
        <div class="split-tab-card ${isCurrentLeft ? 'active-left' : ''} ${isCurrentRight ? 'active-right' : ''}" data-store-id="${store.id}" data-tab-id="${tab.id}" title="Buka ${escapeHtml(tab.title)} di sisi kanan">
          <div class="split-tab-card-title">${escapeHtml(tab.title)}</div>
          <div class="split-tab-card-url">${escapeHtml(domain)}</div>
          ${pillHtml}
        </div>`;
    }).join('');

    const unreadBadgeHtml = unread > 0
      ? `<span class="split-group-unread-badge">${unread} Pesan</span>`
      : '';

    return `
      <div class="split-picker-store-group">
        <div class="split-group-header">
          <div class="split-group-left">
            <div class="split-group-avatar ${cfg.faviconClass}" ${bgStyle}>${escapeHtml(initials)}</div>
            <span class="split-group-name">${escapeHtml(store.name)}</span>
            <span class="split-group-mp-tag">${escapeHtml(cfg.label || store.marketplace)}</span>
          </div>
          ${unreadBadgeHtml}
        </div>
        <div class="split-tab-cards-grid">
          ${tabsHtml}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = html;

  // Bind klik kartu
  container.querySelectorAll('.split-tab-card').forEach(card => {
    card.addEventListener('click', () => {
      const sId = card.dataset.storeId;
      const tId = card.dataset.tabId;
      if (sId && tId && typeof selectRightSplitTab === 'function') {
        selectRightSplitTab(sId, tId);
      }
    });
  });
}
window.renderSplitTabPicker = renderSplitTabPicker;

// ── Inisialisasi Split Resizer & Split Picker Event Listeners ─────────────────
let isSplitResizerBound = false;
function initSplitResizer() {
  if (isSplitResizerBound) return;
  isSplitResizerBound = true;

  const resizer = document.getElementById('split-resizer');
  const webviewContainer = document.getElementById('webview-container');
  if (!resizer || !webviewContainer) return;

  let isDragging = false;

  resizer.addEventListener('mousedown', (e) => {
    if (!isSplitViewActive) return;
    isDragging = true;
    resizer.classList.add('dragging');
    document.body.classList.add('resizing');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || !isSplitViewActive) return;
    const containerRect = webviewContainer.getBoundingClientRect();
    if (containerRect.width <= 0) return;

    const offsetX = e.clientX - containerRect.left;
    let percent = (offsetX / containerRect.width) * 100;
    percent = Math.max(20, Math.min(80, percent));

    splitRatio = Math.round(percent);
    webviewContainer.style.setProperty('--split-ratio', `${splitRatio}%`);
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      resizer.classList.remove('dragging');
      document.body.classList.remove('resizing');
    }
  });

  // Double click untuk reset 50:50
  resizer.addEventListener('dblclick', () => {
    if (!isSplitViewActive) return;
    splitRatio = 50;
    webviewContainer.style.setProperty('--split-ratio', '50%');
    showToast('Ukuran layar diatur ke 50:50', '');
  });

  // Listener tombol picker modal split (Batal / Kembali ke tab sebelumnya)
  document.getElementById('btn-split-picker-close')?.addEventListener('click', () => {
    if (typeof cancelSplitTabPicker === 'function') cancelSplitTabPicker();
    else if (typeof closeSplitView === 'function') closeSplitView();
  });

  // Terapkan mode tampilan awal (responsive vs scroll)
  if (typeof applySplitDisplayModeUI === 'function') {
    applySplitDisplayModeUI();
  }

  // Listener input pencarian di thumbnail picker
  const searchInput = document.getElementById('split-picker-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => renderSplitTabPicker(), 60));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (typeof cancelSplitTabPicker === 'function') cancelSplitTabPicker();
      }
    });
  }

  // Listener filter marketplace chips
  document.querySelectorAll('.split-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.split-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      splitPickerMarketplace = chip.dataset.mp || 'all';
      renderSplitTabPicker();
    });
  });

  // Listener klik pada pane untuk memindahkan fokus
  const leftPane = document.getElementById('split-pane-left');
  const rightPane = document.getElementById('split-pane-right');

  leftPane?.addEventListener('mousedown', () => {
    if (typeof setFocusedPane === 'function') setFocusedPane('left');
  });
  rightPane?.addEventListener('mousedown', () => {
    if (typeof setFocusedPane === 'function') setFocusedPane('right');
  });
}
window.initSplitResizer = initSplitResizer;
