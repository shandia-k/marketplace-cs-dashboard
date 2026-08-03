// -- Status Bar Logic
const statusBarEl = document.getElementById('status-bar');
let sessionStartTime = Date.now();
let statusBarInterval = null;
let lastAppMetrics = [];

async function updateStatusBar() {
  if (!statusBarEl) return;

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
      <div class="status-bar-group" id="btn-feedback" title="Lapor Bug / Feedback" style="cursor:pointer;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Feedback</span>
      </div>
    `;
  }

  // Calculate generic stats
  const openStoresCount = Object.keys(storeTabs).length;
  let totalTabs = 0;
  let sleepingTabsCount = 0;
  
  const activeTabsList = [];
  const sleepingTabsList = [];
  
  Object.values(storeTabs).forEach(tabs => {
    totalTabs += tabs.length;
    tabs.forEach(tab => {
      const storeName = stores.find(s => s.id === tab.id.split('-')[0])?.name || 'Toko';
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
  // Calculate RAM per tab using data from webview-preload.js
  const ramList = [];
  Object.values(storeTabs).forEach(tabs => {
    tabs.forEach(tab => {
      const entry = webviewMap[tab.id];
      const storeName = stores.find(s => s.id === tab.id.split('-')[0])?.name || 'Toko';
      
      let memMB = 0;
      if (entry && entry.hibernated) {
        memMB = 0; // Sleeping takes almost 0 memory in renderer
      } else if (entry && entry.memKB) {
        memMB = entry.memKB / 1024;
      }
      
      ramList.push({ name: `${storeName} - ${tab.title || 'Chat'}`, mb: memMB, hibernated: entry?.hibernated });
    });
  });

  // Sort highest memory first
  ramList.sort((a, b) => b.mb - a.mb);
  
  let ramHtml = '<strong>Penggunaan RAM:</strong><br>';
  ramHtml += ramList.length > 0 ? ramList.map(r => {
    if (r.hibernated) return `<div style="color:#10b981; display:flex; justify-content:space-between"><span>• ${escapeHtml(r.name)}</span><span>0 MB (Tidur)</span></div>`;
    const mbStr = r.mb > 1024 ? `${(r.mb/1024).toFixed(1)} GB` : `${Math.round(r.mb)} MB`;
    return `<div style="display:flex; justify-content:space-between; gap: 20px;"><span>• ${escapeHtml(r.name)}</span><span>${mbStr}</span></div>`;
  }).join('') : '<div style="color:var(--text-secondary)">Tidak ada tab</div>';
  
  ramHtml += `<div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between;"><strong>Total Aplikasi:</strong><strong>${ramStr}</strong></div>`;
  
  document.getElementById('sb-ram-tooltip').innerHTML = ramHtml;
}

// Jalankan setiap 1.5 detik
statusBarInterval = setInterval(updateStatusBar, 1500);
updateStatusBar();
