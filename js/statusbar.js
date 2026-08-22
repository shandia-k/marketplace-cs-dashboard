// -- Status Bar Logic
const statusBarEl = document.getElementById('status-bar');
let sessionStartTime = Date.now();
let statusBarInterval = null;
let isUpdatingStatusBar = false;

async function updateStatusBar() {
  if (!statusBarEl || isUpdatingStatusBar) return;
  isUpdatingStatusBar = true;

  try {
    if (window.electronAPI && typeof window.electronAPI.getAppMemoryMB === 'function') {
      try {
        const mb = await window.electronAPI.getAppMemoryMB();
        if (typeof mb === 'number' && mb > 0) ramUsageMB = mb;
      } catch (e) {}
    }

    const totalStores = stores.length;
    if (totalStores === 0) {
      statusBarEl.style.display = 'none';
      return;
    }
    statusBarEl.style.display = 'flex';

  // Initialize DOM once to avoid flicker on hover
  if (!statusBarEl.hasAttribute('data-init')) {
    statusBarEl.setAttribute('data-init', 'true');
    statusBarEl.innerHTML = `
      <div class="status-bar-group has-tooltip">
        <span class="status-dot status-green"></span>
        <span id="sb-stores-text">0 toko dibuka</span>
        <div class="status-tooltip" id="sb-stores-tooltip"></div>
      </div>
      <div class="status-bar-sep"></div>
      <div class="status-bar-group has-tooltip">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span id="sb-tabs-text">0 tab aktif</span>
        <span id="sb-sleep-text" class="status-sleep" style="display:none;"></span>
        <div class="status-tooltip" id="sb-tabs-tooltip"></div>
      </div>
      <div class="status-bar-sep"></div>
      <div class="status-bar-group has-tooltip">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <path d="M6 6V4M10 6V4M14 6V4M18 6V4"/>
        </svg>
        <span id="sb-ram-text">0 MB</span>
        <div class="status-tooltip" id="sb-ram-tooltip"></div>
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
    `;
  }

  // Calculate accurate tab stats
  const openStoresCount = Object.keys(storeTabs).length;
  let totalTabs = 0;
  let runningTabsCount = 0;
  let hibernatedTabsCount = 0;
  let idleTabsCount = 0; // Tab tersimpan dalam sesi tapi belum pernah dimuat ke RAM
  
  Object.entries(storeTabs).forEach(([storeId, tabs]) => {
    totalTabs += tabs.length;
    tabs.forEach(tab => {
      const entry = webviewMap[tab.id];
      if (entry && entry.webview && !entry.hibernated) {
        runningTabsCount++;
      } else if (entry && entry.hibernated) {
        hibernatedTabsCount++;
      } else {
        idleTabsCount++;
      }
    });
  });

  // Session timer
  const elapsedMs = Date.now() - sessionStartTime;
  const hours   = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Update text values
  document.getElementById('sb-stores-text').textContent = `${openStoresCount} toko dibuka`;
  document.getElementById('sb-tabs-text').textContent = `${runningTabsCount} tab aktif`;
  
  const sleepEl = document.getElementById('sb-sleep-text');
  if (hibernatedTabsCount > 0 && idleTabsCount > 0) {
    sleepEl.style.display = 'inline-block';
    sleepEl.innerHTML = `&#x1F343; ${hibernatedTabsCount} tidur &middot; ${idleTabsCount} idle`;
  } else if (hibernatedTabsCount > 0) {
    sleepEl.style.display = 'inline-block';
    sleepEl.innerHTML = `&#x1F343; ${hibernatedTabsCount} tidur`;
  } else if (idleTabsCount > 0) {
    sleepEl.style.display = 'inline-block';
    sleepEl.innerHTML = `&#x1F343; ${idleTabsCount} idle`;
  } else {
    sleepEl.style.display = 'none';
  }

  const ramStr = ramUsageMB >= 1024 ? `${(ramUsageMB / 1024).toFixed(1)} GB` : `${Math.round(ramUsageMB)} MB`;
  const ramEl = document.getElementById('sb-ram-text');
  ramEl.textContent = ramStr;
  ramEl.className = ramUsageMB >= 1024 ? 'status-warn' : '';

  document.getElementById('sb-session-text').textContent = `Sesi: ${timeStr}`;

  // Update Tooltips Content
  // 1. Stores Tooltip
  const openStores = stores.filter(s => storeTabs[s.id] && storeTabs[s.id].length > 0);
  let storesTooltip = `<div class="sb-tooltip-title">Toko Dibuka (${openStores.length})</div>`;
  if (openStores.length > 0) {
    storesTooltip += openStores.map(s => {
      const cfg = MARKETPLACE_CONFIG[s.marketplace] || MARKETPLACE_CONFIG.custom;
      const count = (storeTabs[s.id] || []).length;
      return `
        <div class="sb-tooltip-item" style="padding-left:0;">
          <span style="font-weight:500; color:var(--text-primary);">• ${escapeHtml(s.name)}</span>
          <span style="color:var(--text-muted); font-size:10.5px;">${escapeHtml(cfg.label || s.marketplace)} · ${count} tab</span>
        </div>`;
    }).join('');
  } else {
    storesTooltip += '<div style="color:var(--text-muted)">Belum ada toko yang dibuka.</div>';
  }
  document.getElementById('sb-stores-tooltip').innerHTML = storesTooltip;

  // 2. Tabs Tooltip (Organized hierarchically by store, showing active vs sleeping vs idle status per tab)
  const tabStatusSubtitle = [
    `${runningTabsCount} Aktif`,
    hibernatedTabsCount > 0 ? `${hibernatedTabsCount} Tidur` : null,
    idleTabsCount > 0 ? `${idleTabsCount} Idle` : null
  ].filter(Boolean).join(' · ');

  let tabsHtml = `<div class="sb-tooltip-title">Status Tab (${tabStatusSubtitle})</div>`;
  if (openStores.length > 0) {
    tabsHtml += openStores.map(store => {
      const tabs = storeTabs[store.id] || [];
      const cfg = MARKETPLACE_CONFIG[store.marketplace] || MARKETPLACE_CONFIG.custom;
      const itemsHtml = tabs.map(tab => {
        const entry = webviewMap[tab.id];
        let statusBadge = '';
        let itemClass = '';

        if (entry && entry.webview && !entry.hibernated) {
          statusBadge = '<span style="color:#38bdf8; font-size:10px; font-weight:600;">⚡ Aktif</span>';
        } else if (entry && entry.hibernated) {
          statusBadge = '<span style="color:#10b981; font-size:10px; font-weight:600;">🍃 Tidur</span>';
          itemClass = 'hibernated';
        } else {
          statusBadge = '<span style="color:var(--text-muted); font-size:10px;">💤 Idle (0 MB)</span>';
        }

        return `
          <div class="sb-tooltip-item ${itemClass}">
            <span>• ${escapeHtml(tab.title || 'Chat')}</span>
            ${statusBadge}
          </div>`;
      }).join('');

      return `
        <div class="sb-tooltip-group">
          <div class="sb-tooltip-group-header">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${cfg.groupColor || '#DF1683'};"></span>
            <span>${escapeHtml(store.name)}</span>
            <span style="color:var(--text-muted); font-weight:400; font-size:10.5px;">(${tabs.length} tab)</span>
          </div>
          ${itemsHtml}
        </div>`;
    }).join('');

    const savedRamText = (hibernatedTabsCount + idleTabsCount) > 0 
      ? `🍃 ${hibernatedTabsCount + idleTabsCount} Tab Hemat RAM` 
      : '⚡ Semua Berjalan Aktif';

    tabsHtml += `
      <div class="sb-tooltip-footer">
        <span>Total: ${totalTabs} Tab di ${openStores.length} Toko</span>
        <span>${savedRamText}</span>
      </div>`;
  } else {
    tabsHtml += '<div style="color:var(--text-muted)">Tidak ada tab aktif</div>';
  }
  document.getElementById('sb-tabs-tooltip').innerHTML = tabsHtml;

  // 3. RAM Tooltip (Focus on Memory Health, Top 5 Consumers, and Saved RAM from Hibernation)
  let processMetrics = [];
  try {
    if (window.electronAPI && typeof window.electronAPI.getAppMetricsDetails === 'function') {
      processMetrics = await window.electronAPI.getAppMetricsDetails();
    }
  } catch (e) {}

  const activeRamList = [];
  Object.entries(storeTabs).forEach(([storeId, tabs]) => {
    const store = stores.find(s => s.id === storeId);
    const storeName = store?.name || 'Toko';
    tabs.forEach(tab => {
      const entry = webviewMap[tab.id];
      if (!entry || entry.hibernated) return;

      let memMB = 0;
      let wcId = entry?.wcId;
      if (!wcId && entry?.webview && typeof entry.webview.getWebContentsId === 'function') {
        try {
          wcId = entry.webview.getWebContentsId();
          if (entry) entry.wcId = wcId;
        } catch (e) {}
      }

      if (wcId && processMetrics.length > 0) {
        const metric = processMetrics.find(m => m.wcId === wcId);
        if (metric && metric.memoryKB) {
          memMB = metric.memoryKB / 1024;
          if (entry) entry.memKB = metric.memoryKB;
        } else if (entry && entry.memKB) {
          memMB = entry.memKB / 1024;
        }
      } else if (entry && entry.memKB) {
        memMB = entry.memKB / 1024;
      }

      if (memMB > 0) {
        activeRamList.push({ name: `${storeName} - ${tab.title || 'Chat'}`, mb: memMB });
      }
    });
  });

  // Sort highest memory first & take top 5
  activeRamList.sort((a, b) => b.mb - a.mb);
  const topConsumers = activeRamList.slice(0, 5);

  const ramStatusLabel = ramUsageMB >= 2048 
    ? '<span style="color:#ef4444; font-weight:700;">⚠️ Kritis (> 2.0 GB)</span>' 
    : (ramUsageMB >= 1024 ? '<span style="color:#fb923c; font-weight:600;">⚡ Wajar (1-2 GB)</span>' : '<span style="color:#22c55e; font-weight:600;">✨ Optimal (< 1 GB)</span>');

  let ramHtml = `
    <div class="sb-tooltip-title">Analitik Penggunaan RAM</div>
    <div class="sb-ram-metrics">
      <div class="sb-ram-metric-row">
        <span>Total Memori Aplikasi:</span>
        <strong style="color: ${ramUsageMB >= 2048 ? '#ef4444' : (ramUsageMB >= 1024 ? '#fb923c' : '#22c55e')}">${ramStr}</strong>
      </div>
      <div class="sb-ram-metric-row">
        <span>Status Kesehatan RAM:</span>
        ${ramStatusLabel}
      </div>
      ${(hibernatedTabsCount + idleTabsCount) > 0 ? `
      <div class="sb-ram-metric-row" style="color:#10b981;">
        <span>🍃 Tab Hemat RAM:</span>
        <span>${hibernatedTabsCount + idleTabsCount} Tab (${hibernatedTabsCount} Tidur, ${idleTabsCount} Idle)</span>
      </div>` : ''}
    </div>
    <div class="sb-ram-divider"></div>
  `;

  if (topConsumers.length > 0) {
    ramHtml += `<div class="sb-ram-top-title">Top ${topConsumers.length} Konsumen RAM Tertinggi:</div>`;
    ramHtml += topConsumers.map((r, idx) => {
      const mbStr = r.mb >= 1024 ? `${(r.mb/1024).toFixed(1)} GB` : `${Math.round(r.mb)} MB`;
      return `
        <div class="sb-tooltip-item" style="padding-left: 4px;">
          <span>${idx + 1}. ${escapeHtml(r.name)}</span>
          <span style="font-weight: 600; color: ${r.mb > 400 ? '#fb923c' : 'var(--text-primary)'}; font-family: monospace;">${mbStr}</span>
        </div>`;
    }).join('');
  } else {
    ramHtml += '<div style="color:var(--text-muted); font-size:11px;">Belum ada konsumsi RAM terukur pada tab aktif.</div>';
  }

  document.getElementById('sb-ram-tooltip').innerHTML = ramHtml;

  // 4. Update Clipboard History Tooltip
  updateStatusBarClipboard();
  } finally {
    isUpdatingStatusBar = false;
  }
}

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

// Jalankan otomatis
startStatusBarTimer();
