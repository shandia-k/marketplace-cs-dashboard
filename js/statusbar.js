// -- Status Bar Logic
const statusBarEl = document.getElementById('status-bar');
let sessionStartTime = Date.now();
let statusBarInterval = null;
let isUpdatingStatusBar = false;

let devMimicryInfo = null;
let devMimicryFetched = false;

async function fetchDevMimicryInfoOnce() {
  if (devMimicryFetched) return;
  devMimicryFetched = true;
  try {
    if (window.electronAPI && typeof window.electronAPI.getDevMimicryInfo === 'function') {
      devMimicryInfo = await window.electronAPI.getDevMimicryInfo();
    }
  } catch (e) {}
}

async function updateStatusBar() {
  if (!statusBarEl || isUpdatingStatusBar) return;
  isUpdatingStatusBar = true;

  try {
    await fetchDevMimicryInfoOnce();

    const totalStores = stores.length;
    if (totalStores === 0) {
      statusBarEl.style.display = 'none';
      return;
    }
    statusBarEl.style.display = 'flex';

    // Initialize DOM once to avoid flicker on hover
    if (!statusBarEl.hasAttribute('data-init')) {
      statusBarEl.setAttribute('data-init', 'true');
      const devBadgeHtml = (devMimicryInfo && devMimicryInfo.isDev) ? `
        <div class="status-bar-sep"></div>
        <div class="status-bar-group has-tooltip" id="sb-dev-headers-group" style="cursor:pointer; color: #38bdf8; font-weight: 600;">
          <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 1px 5px; border-radius: 4px; font-size: 9.5px; border: 1px solid rgba(56,189,248,0.3); letter-spacing: 0.3px;">DEV HEADERS</span>
          <span id="sb-dev-headers-text" style="font-size:10px; color:#94a3b8;">Chrome ${(devMimicryInfo.chromeVersion || '126').split('.')[0]}</span>
          <div class="status-tooltip" id="sb-dev-headers-tooltip" style="min-width: 320px; max-width: 440px;"></div>
        </div>
      ` : '';

      statusBarEl.innerHTML = `
        <div class="status-bar-group has-tooltip">
          <span class="status-dot status-green"></span>
          <span id="sb-stores-text">0 toko dibuka</span>
          <div class="status-tooltip" id="sb-stores-tooltip"></div>
        </div>
        <div class="status-bar-sep"></div>
        <div class="status-bar-group">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span id="sb-session-text">Sesi: 00:00:00</span>
        </div>
        <div class="status-bar-sep"></div>
        <div class="status-bar-group has-tooltip has-clipboard-history" id="sb-clipboard-group" style="cursor:pointer; color: #fbbf24; font-weight: 500;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          <span id="sb-clipboard-text" style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Clip: ...</span>
          <div class="status-tooltip clipboard-history-tooltip" id="sb-clipboard-tooltip"></div>
        </div>
        ${devBadgeHtml}
      `;
    }

    // Hitung total toko dibuka dan seluruh tab di dalamnya
    const openStores = stores.filter(s => storeTabs[s.id] && storeTabs[s.id].length > 0);
    let totalTabsCount = 0;
    openStores.forEach(s => {
      totalTabsCount += (storeTabs[s.id] || []).length;
    });

    // Session timer
    const elapsedMs = Date.now() - sessionStartTime;
    const hours   = Math.floor(elapsedMs / 3600000);
    const minutes = Math.floor((elapsedMs % 3600000) / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update text values
    const storesTextEl = document.getElementById('sb-stores-text');
    if (storesTextEl) {
      storesTextEl.textContent = totalTabsCount > 0 
        ? `${openStores.length} toko dibuka (${totalTabsCount} tab)` 
        : `${openStores.length} toko dibuka`;
    }

    const sessionTextEl = document.getElementById('sb-session-text');
    if (sessionTextEl) {
      sessionTextEl.textContent = `Sesi: ${timeStr}`;
    }

    // Update Tooltip Toko Dibuka: Detail per toko dan tab-tab di dalamnya
    const tooltipEl = document.getElementById('sb-stores-tooltip');
    if (tooltipEl) {
      let storesTooltip = `<div class="sb-tooltip-title">Toko Dibuka (${openStores.length} Toko · ${totalTabsCount} Tab)</div>`;
      if (openStores.length > 0) {
        storesTooltip += openStores.map(s => {
          const cfg = (typeof MARKETPLACE_CONFIG !== 'undefined' && MARKETPLACE_CONFIG[s.marketplace]) 
            ? MARKETPLACE_CONFIG[s.marketplace] 
            : { label: s.marketplace, groupColor: '#DF1683' };
          const tabs = storeTabs[s.id] || [];
          const isStoreActive = s.id === activeStoreId;

          const tabsListHtml = tabs.map(tab => {
            const isCurTab = isStoreActive && tab.id === activeTabMap[s.id];
            return `
              <div class="sb-tooltip-item" style="padding-left: 10px; display: flex; align-items: center; justify-content: space-between;">
                <span style="${isCurTab ? 'color:#38bdf8; font-weight:600;' : 'color:var(--text-secondary);'}">• ${escapeHtml(tab.title || 'Tab')}</span>
                ${isCurTab ? '<span style="font-size:9.5px; color:#38bdf8; background:rgba(56,189,248,0.12); padding:1px 6px; border-radius:8px; margin-left:8px;">Aktif</span>' : ''}
              </div>`;
          }).join('');

          return `
            <div class="sb-tooltip-group" style="margin-bottom: 8px;">
              <div class="sb-tooltip-group-header" style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${cfg.groupColor || '#DF1683'};"></span>
                  <span style="font-weight:600; color:var(--text-primary);">${escapeHtml(s.name)}</span>
                </div>
                <span style="color:var(--text-muted); font-size:10.5px;">${escapeHtml(cfg.label || s.marketplace)} · ${tabs.length} tab</span>
              </div>
              ${tabsListHtml}
            </div>`;
        }).join('');
      } else {
        storesTooltip += '<div style="color:var(--text-muted)">Belum ada toko yang dibuka.</div>';
      }
      tooltipEl.innerHTML = storesTooltip;
    }

    // Update Clipboard History Tooltip
    updateStatusBarClipboard();

    // Update Dev Mimicry Headers Tooltip (jika running in dev mode / npm start)
    updateStatusBarDevHeaders();
  } finally {
    isUpdatingStatusBar = false;
  }
}

let lastDevTooltipRenderKey = null;

function updateStatusBarDevHeaders() {
  const tooltipEl = document.getElementById('sb-dev-headers-tooltip');
  if (!tooltipEl || !devMimicryInfo || !devMimicryInfo.isDev) return;

  const currentStore = (typeof stores !== 'undefined' && Array.isArray(stores)) ? stores.find(s => s.id === activeStoreId) : null;
  const currentTab = (currentStore && typeof storeTabs !== 'undefined' && storeTabs[currentStore.id]) ? storeTabs[currentStore.id].find(t => t.id === activeTabMap[currentStore.id]) : null;
  const currentWv = typeof getActiveWebview === 'function' ? getActiveWebview() : null;
  let liveUrl = currentTab?.url || currentStore?.url || 'https://seller.shopee.co.id/';
  try {
    if (currentWv && typeof currentWv.getURL === 'function') {
      const u = currentWv.getURL();
      if (u && u !== 'about:blank') liveUrl = u;
    }
  } catch (e) {}

  const isGoogle = liveUrl.includes('accounts.google.com') || liveUrl.includes('mail.google.com') || liveUrl.includes('google.com/accounts');
  const activeUa = isGoogle ? (devMimicryInfo.cleanFirefoxUserAgent || 'Firefox Masking') : (devMimicryInfo.cleanChromeUserAgent || 'Chrome 126 Mimicry');
  const partitionName = currentStore ? (typeof getStorePartition === 'function' ? getStorePartition(currentStore) : (currentStore.partition || `persist:${currentStore.id}`)) : 'Default Session';

  const renderKey = `${currentStore?.id || 'none'}|${liveUrl}|${isGoogle}`;
  if (renderKey === lastDevTooltipRenderKey) return;
  lastDevTooltipRenderKey = renderKey;

  const hints = devMimicryInfo.clientHints || {};
  const chUa = hints['Sec-CH-UA'] || '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"';
  const chMobile = hints['Sec-CH-UA-Mobile'] || '?0';
  const chPlatform = hints['Sec-CH-UA-Platform'] || '"Windows"';

  let html = `
    <div class="sb-tooltip-title" style="color:#38bdf8; display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
      <span style="display:flex; align-items:center; gap:6px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Chromium Mimicry Inspector (Dev Mode)
      </span>
      <span style="font-size:9.5px; background:rgba(56,189,248,0.18); color:#38bdf8; padding:2px 6px; border-radius:6px; border:1px solid rgba(56,189,248,0.35);">npm start</span>
    </div>
    
    <div style="background:var(--bg-tertiary, rgba(0,0,0,0.25)); padding:8px 10px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:8px; font-size:11px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:var(--text-muted);">Toko Aktif:</span>
        <strong style="color:var(--text-primary);">${escapeHtml(currentStore?.name || 'Belum dipilih')}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:var(--text-muted);">Partisi Sesi:</span>
        <code style="color:#38bdf8; font-size:10.5px;">${escapeHtml(partitionName)}</code>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span style="color:var(--text-muted);">Mode Header:</span>
        <span style="color:${isGoogle ? '#f59e0b' : '#22c55e'}; font-weight:600;">
          ${isGoogle ? '🦊 Firefox Masking (Google Auth)' : '🌐 Chrome 126 Parity (Marketplace)'}
        </span>
      </div>
    </div>

    <div style="font-size:10.5px; line-height:1.6; color:var(--text-secondary); margin-bottom:8px;">
      <div style="margin-bottom:4px;">
        <span style="color:var(--text-muted); font-weight:600;">User-Agent Terkirim:</span><br>
        <code style="display:block; word-break:break-all; background:var(--bg-primary, #0f1117); padding:4px 6px; border-radius:4px; margin-top:2px; font-size:10px; color:#e2e8f0;">${escapeHtml(activeUa)}</code>
      </div>
      ${!isGoogle ? `
      <div style="margin-bottom:4px;">
        <span style="color:var(--text-muted); font-weight:600;">Sec-CH-UA (Client Hints):</span><br>
        <code style="display:block; word-break:break-all; background:var(--bg-primary, #0f1117); padding:4px 6px; border-radius:4px; margin-top:2px; font-size:10px; color:#38bdf8;">${escapeHtml(chUa)}</code>
      </div>
      <div style="display:flex; gap:12px; margin-top:4px;">
        <div><span style="color:var(--text-muted);">Mobile:</span> <code style="color:#22c55e;">${escapeHtml(chMobile)}</code></div>
        <div><span style="color:var(--text-muted);">Platform:</span> <code style="color:#22c55e;">${escapeHtml(chPlatform)}</code></div>
        <div><span style="color:var(--text-muted);">POST Intercept:</span> <code style="color:#22c55e;">Active</code></div>
      </div>
      ` : `
      <div style="color:#f59e0b; font-size:10.5px; padding:4px 6px; background:rgba(245,158,11,0.1); border-radius:4px;">
        ℹ️ Sec-CH-UA di-strip otomatis untuk mencegah deteksi Botguard pada alur Google OAuth.
      </div>
      `}
    </div>

    <button onclick="copyDevHeadersToClipboard();" style="width:100%; padding:6px 10px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.4); color:#38bdf8; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.15s ease;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
      Salin Info Header Toko Ini (JSON)
    </button>
  `;

  tooltipEl.innerHTML = html;
}

function copyDevHeadersToClipboard() {
  const currentStore = (typeof stores !== 'undefined' && Array.isArray(stores)) ? stores.find(s => s.id === activeStoreId) : null;
  const currentTab = (currentStore && typeof storeTabs !== 'undefined' && storeTabs[currentStore.id]) ? storeTabs[currentStore.id].find(t => t.id === activeTabMap[currentStore.id]) : null;
  const currentWv = typeof getActiveWebview === 'function' ? getActiveWebview() : null;
  let liveUrl = currentTab?.url || currentStore?.url || 'https://seller.shopee.co.id/';
  try {
    if (currentWv && typeof currentWv.getURL === 'function') {
      const u = currentWv.getURL();
      if (u && u !== 'about:blank') liveUrl = u;
    }
  } catch (e) {}

  const isGoogle = liveUrl.includes('accounts.google.com') || liveUrl.includes('mail.google.com') || liveUrl.includes('google.com/accounts');
  const activeUa = isGoogle ? (devMimicryInfo?.cleanFirefoxUserAgent || '') : (devMimicryInfo?.cleanChromeUserAgent || '');
  const partitionName = currentStore ? (typeof getStorePartition === 'function' ? getStorePartition(currentStore) : (currentStore.partition || `persist:${currentStore.id}`)) : 'Default Session';

  const payload = {
    storeName: currentStore?.name || 'Unknown Store',
    marketplace: currentStore?.marketplace || 'custom',
    partition: partitionName,
    url: liveUrl,
    requestHeaders: {
      'User-Agent': activeUa,
      ...(isGoogle ? {} : (devMimicryInfo?.clientHints || {}))
    },
    postBodyPreservation: 'Active (setWindowOpenHandler)',
    aboutBlankAsyncSupport: 'Active',
    stealthMode: isGoogle ? 'Firefox Google Masking' : 'Chromium 126 Desktop Parity'
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(() => {
      if (typeof showToast === 'function') {
        showToast('📋 Info header webview toko berhasil disalin ke clipboard!', 'success');
      }
    }).catch(() => {});
  }
}
window.copyDevHeadersToClipboard = copyDevHeadersToClipboard;
window.updateStatusBarDevHeaders  = updateStatusBarDevHeaders;

let lastRenderedClipKey = null;

function updateStatusBarClipboard(force = false) {
  const textEl = document.getElementById('sb-clipboard-text');
  const tooltipEl = document.getElementById('sb-clipboard-tooltip');
  if (!textEl || !tooltipEl) return;

  const clipVal = typeof currentClipboardValue !== 'undefined' ? currentClipboardValue.trim() : '';
  const cleanClip = clipVal.replace(/[\r\n\t]+/g, ' ').trim();
  const displaySnippet = cleanClip ? (cleanClip.length > 16 ? cleanClip.substring(0, 14) + '…' : cleanClip) : 'Kosong';
  textEl.textContent = `Clip: ${displaySnippet}`;

  const history = typeof clipboardHistory !== 'undefined' ? clipboardHistory : [];

  // Hindari render ulang DOM tooltip jika data tidak berubah agar tidak flicker/hilang saat hover
  const renderKey = `${clipVal}|${history.length}|${history.map(h => h.id).join(',')}`;
  if (!force && renderKey === lastRenderedClipKey) {
    return;
  }
  lastRenderedClipKey = renderKey;

  if (history.length === 0) {
    tooltipEl.innerHTML = `
      <div class="clip-history-flyout">
        <div class="clip-history-header">
          <div class="clip-history-title">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
            <span>Riwayat Smart Clipboard</span>
          </div>
        </div>
        <div class="clip-history-empty">
          Belum ada riwayat clipboard.<br>
          <span style="font-size:11px; opacity:0.7;">Copy / Cut nomor pesanan atau resi untuk mulai.</span>
        </div>
      </div>
    `;
    return;
  }

  let html = `
    <div class="clip-history-flyout">
      <div class="clip-history-header">
        <div class="clip-history-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          <span>Riwayat Clipboard (${history.length})</span>
        </div>
        <button class="btn-clear-clip-history" onclick="clearClipboardHistory();" title="Bersihkan riwayat">Hapus Semua</button>
      </div>
      <div class="clip-history-list">
  `;

  history.forEach(item => {
    const isActive = item.text === clipVal;
    const relTime = typeof formatRelativeTime === 'function' ? formatRelativeTime(item.time) : '';
    const rawText = (item.text || '').trim();
    const cleanText = rawText.replace(/[\r\n\t]+/g, ' ');
    // Batasi teks penampilan agar tidak membludak jika isi clipboard sangat panjang
    const previewText = cleanText.length > 90 ? cleanText.substring(0, 87) + '…' : cleanText;
    const safeText = escapeHtml(previewText);
    const tooltipTitle = escapeHtml(rawText.length > 200 ? rawText.substring(0, 197) + '…' : rawText);
    const sourceLabel = escapeHtml(item.source || 'Aplikasi Luar');

    html += `
      <div class="clip-history-item ${isActive ? 'active' : ''}" onclick="selectClipboardFromHistory('${item.id}');" title="${tooltipTitle}">
        <div class="clip-history-item-top">
          <span class="clip-history-text">${safeText}</span>
          ${isActive ? '<span class="clip-active-badge">✓ AKTIF</span>' : '<span class="clip-pick-badge">Pilih</span>'}
        </div>
        <div class="clip-history-meta">
          <span class="clip-source-badge">${sourceLabel}</span>
          <span class="clip-time">${relTime}</span>
        </div>
      </div>
    `;
  });

  html += `
      </div>
      <div class="clip-history-footer">
        <span>⚡ Klik item untuk langsung mengaktifkannya</span>
      </div>
    </div>
  `;

  tooltipEl.innerHTML = html;
}

window.updateStatusBarClipboard = updateStatusBarClipboard;
window.updateStatusBar          = updateStatusBar;

function startStatusBarTimer() {
  if (statusBarInterval) clearInterval(statusBarInterval);
  statusBarInterval = setInterval(updateStatusBar, 1500);
  updateStatusBar();
}

function stopStatusBarTimer() {
  if (statusBarInterval) {
    clearInterval(statusBarInterval);
    statusBarInterval = null;
  }
}

window.startStatusBarTimer = startStatusBarTimer;
window.stopStatusBarTimer  = stopStatusBarTimer;

// ── App.StatusBar Module Interface ──────────────────────────────────────────
window.App = window.App || {};
window.App.StatusBar = {
  update: updateStatusBar,
  updateClipboard: updateStatusBarClipboard,
  start: startStatusBarTimer,
  stop: stopStatusBarTimer
};

// Jalankan otomatis
startStatusBarTimer();
