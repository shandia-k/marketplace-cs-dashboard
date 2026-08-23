// -- Status Bar Logic
const statusBarEl = document.getElementById('status-bar');
let sessionStartTime = Date.now();
let statusBarInterval = null;
let isUpdatingStatusBar = false;

async function updateStatusBar() {
  if (!statusBarEl || isUpdatingStatusBar) return;
  isUpdatingStatusBar = true;

  try {
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
