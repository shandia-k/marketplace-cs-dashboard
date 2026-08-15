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

  // Calculate generic stats
  const openStoresCount = Object.keys(storeTabs).length;
  let totalTabs = 0;
  let sleepingTabsCount = 0;
  
  const activeTabsList = [];
  const sleepingTabsList = [];
  
  Object.entries(storeTabs).forEach(([storeId, tabs]) => {
    totalTabs += tabs.length;
    const store = stores.find(s => s.id === storeId);
    const storeName = store?.name || 'Toko';
    tabs.forEach(tab => {
      if (webviewMap[tab.id]?.hibernated) {
        sleepingTabsCount++;
        sleepingTabsList.push(`${storeName} - ${tab.title || 'Chat'}`);
      } else {
        activeTabsList.push(`${storeName} - ${tab.title || 'Chat'}`);
      }
    });
  });

  const activeTabsCount = totalTabs - sleepingTabsCount;

  // Session timer
  const elapsedMs = Date.now() - sessionStartTime;
  const hours   = Math.floor(elapsedMs / 3600000);
  const minutes = Math.floor((elapsedMs % 3600000) / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Update text values
  document.getElementById('sb-stores-text').textContent = `${openStoresCount} toko dibuka`;
  document.getElementById('sb-tabs-text').textContent = `${activeTabsCount} tab aktif`;
  
  const sleepEl = document.getElementById('sb-sleep-text');
  if (sleepingTabsCount > 0) {
    sleepEl.style.display = 'inline-block';
    sleepEl.innerHTML = `&#x1F343; ${sleepingTabsCount} tidur`;
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
  const openStoresList = stores.filter(s => storeTabs[s.id]).map(s => s.name);
  const storesTooltip = openStoresList.length > 0 
    ? openStoresList.map(s => `<div>• ${escapeHtml(s)}</div>`).join('') 
    : 'Belum ada toko yang dibuka.';
  document.getElementById('sb-stores-tooltip').innerHTML = `<strong>Toko Dibuka:</strong><br>${storesTooltip}`;

  // 2. Tabs Tooltip
  let tabsHtml = '<strong>Tab Aktif:</strong><br>';
  tabsHtml += activeTabsList.length > 0 ? activeTabsList.map(t => `<div style="color:var(--text-secondary)">• ${escapeHtml(t)}</div>`).join('') : '<div style="color:var(--text-secondary)">Tidak ada</div>';
  if (sleepingTabsCount > 0) {
    tabsHtml += '<br><strong>Tab Hibernasi:</strong><br>';
    tabsHtml += sleepingTabsList.map(t => `<div style="color:#10b981">• ${escapeHtml(t)}</div>`).join('');
  }
  document.getElementById('sb-tabs-tooltip').innerHTML = tabsHtml;

  // 3. RAM Tooltip
  // Calculate RAM per tab using data from Chromium Process Metrics
  let processMetrics = [];
  try {
    if (window.electronAPI && typeof window.electronAPI.getAppMetricsDetails === 'function') {
      processMetrics = await window.electronAPI.getAppMetricsDetails();
    }
  } catch (e) {}

  const ramList = [];
  Object.entries(storeTabs).forEach(([storeId, tabs]) => {
    const store = stores.find(s => s.id === storeId);
    const storeName = store?.name || 'Toko';
    tabs.forEach(tab => {
      const entry = webviewMap[tab.id];
      
      let memMB = 0;
      if (entry && entry.hibernated) {
        memMB = 0; // Sleeping takes almost 0 memory in renderer
      } else {
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
      }
      
      ramList.push({ name: `${storeName} - ${tab.title || 'Chat'}`, mb: memMB, hibernated: entry?.hibernated });
    });
  });

  // Sort highest memory first
  ramList.sort((a, b) => b.mb - a.mb);
  
  let ramHtml = '<strong>Penggunaan RAM:</strong><br>';
  ramHtml += ramList.length > 0 ? ramList.map(r => {
    if (r.hibernated) return `<div style="color:#10b981; display:flex; justify-content:space-between; gap: 20px;"><span>• ${escapeHtml(r.name)}</span><span>0 MB (Tidur)</span></div>`;
    const mbStr = r.mb > 1024 ? `${(r.mb/1024).toFixed(1)} GB` : `${Math.round(r.mb)} MB`;
    return `<div style="display:flex; justify-content:space-between; gap: 20px;"><span>• ${escapeHtml(r.name)}</span><span>${mbStr}</span></div>`;
  }).join('') : '<div style="color:var(--text-secondary)">Tidak ada tab</div>';
  
  ramHtml += `<div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between;"><strong>Total Aplikasi:</strong><strong>${ramStr}</strong></div>`;
  
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
